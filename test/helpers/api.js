const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRE = '1h';

const app = require('../../src/app');
const User = require('../../src/models/User');
const Completion = require('../../src/models/Completion');

/**
 * Run the real Express app against an in-memory MongoDB, so tests go through
 * routes, validation, services and the error handler like a real request.
 */

let mongo;
let server;
let baseUrl;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await User.syncIndexes();
  await Completion.syncIndexes();

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
});

/**
 * Send a request to the app
 * @returns {Promise<{ statusCode: number, body: Object }>}
 */
const api = async (method, path, { body, token, rawBody } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || rawBody !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined
  });
  return { statusCode: res.status, body: await res.json() };
};

/**
 * Sign up a parent
 * @returns {Promise<{ parent: Object, token: string }>} The User document and their token
 */
const signupParent = async (email) => {
  const res = await api('POST', '/api/auth/signup', {
    body: { email, password: 'secret123', consent: true }
  });
  assert.equal(res.statusCode, 201, res.body.message);
  return { parent: await User.findById(res.body.data.id), token: res.body.token };
};

/**
 * Add a kid with a login and log them in
 * @returns {Promise<{ kidId: string, kidToken: string }>}
 */
const addKidAndLogin = async (parent, parentToken, { name, username, pin = '1234' }) => {
  const added = await api('POST', '/api/kids', {
    token: parentToken,
    body: { name, age: 8, consent: true, username, pin }
  });
  assert.equal(added.statusCode, 201, added.body.message);

  const login = await api('POST', '/api/auth/kid-login', {
    body: { familyCode: parent.familyCode, username, pin }
  });
  assert.equal(login.statusCode, 200, login.body.message);

  return { kidId: added.body.data._id, kidToken: login.body.token };
};

module.exports = {
  api,
  signupParent,
  addKidAndLogin
};
