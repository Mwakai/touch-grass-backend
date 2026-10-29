const { test } = require('node:test');
const assert = require('node:assert/strict');
const { api, signupParent, addKidAndLogin } = require('./helpers/api');

const User = require('../src/models/User');
const Kid = require('../src/models/Kid');
const Completion = require('../src/models/Completion');
const { MAX_FAILED_LOGINS } = require('../src/utils/kidLogin');

test('kids cannot sign up on their own', async () => {
  const res = await api('POST', '/api/auth/signup', {
    body: { email: 'kid@example.com', password: 'secret123', role: 'kid', familyCode: 'ABC123' }
  });
  assert.equal(res.statusCode, 403);
  assert.equal(await User.countDocuments({ email: 'kid@example.com' }), 0);
});

test('parents must accept the privacy policy, and it is recorded', async () => {
  const refused = await api('POST', '/api/auth/signup', {
    body: { email: 'noconsent@example.com', password: 'secret123' }
  });
  assert.equal(refused.statusCode, 400);

  const { parent } = await signupParent('consent@example.com');
  assert.ok(parent.consent.acceptedAt);
  assert.ok(parent.consent.policyVersion);

  const again = await api('POST', '/api/auth/signup', {
    body: { email: 'Consent@example.com', password: 'secret123', consent: true }
  });
  assert.equal(again.statusCode, 409);
});

test('parent logs in with email and password', async () => {
  await signupParent('login@example.com');

  const ok = await api('POST', '/api/auth/login', {
    body: { email: 'LOGIN@example.com', password: 'secret123' }
  });
  assert.equal(ok.statusCode, 200, ok.body.message);
  assert.ok(ok.body.token);

  const me = await api('GET', '/api/auth/me', { token: ok.body.token });
  assert.equal(me.statusCode, 200);
  assert.equal(me.body.data.email, 'login@example.com');

  const wrong = await api('POST', '/api/auth/login', {
    body: { email: 'login@example.com', password: 'nope123' }
  });
  assert.equal(wrong.statusCode, 401);

  const noToken = await api('GET', '/api/auth/me');
  assert.equal(noToken.statusCode, 401);
});

test('adding a kid needs consent, and a login never stores an email', async () => {
  const { parent, token } = await signupParent('family1@example.com');

  const refused = await api('POST', '/api/kids', {
    token,
    body: { name: 'Amara', age: 8 }
  });
  assert.equal(refused.statusCode, 400);

  const added = await api('POST', '/api/kids', {
    token,
    body: { name: 'Amara', age: 8, consent: true, username: 'Amara', pin: '0420' }
  });
  assert.equal(added.statusCode, 201, added.body.message);
  assert.equal(added.body.data.username, 'amara');

  const kid = await Kid.findById(added.body.data._id);
  assert.equal(String(kid.consent.givenBy), String(parent._id));

  const account = await User.findById(kid.account).select('+password');
  assert.equal(account.email, undefined);
  assert.notEqual(account.password, '0420', 'PIN must be hashed');

  // Two kids without email don't clash on the email index
  const second = await api('POST', '/api/kids', {
    token,
    body: { name: 'Baraka', age: 6, consent: true, username: 'baraka', pin: '1111' }
  });
  assert.equal(second.statusCode, 201, second.body.message);

  // Usernames are unique within a family
  const clash = await api('POST', '/api/kids', {
    token,
    body: { name: 'Other', age: 6, consent: true, username: 'amara', pin: '2222' }
  });
  assert.equal(clash.statusCode, 409);
  assert.equal(clash.body.message, 'That username is already taken in your family');
  assert.equal(await Kid.countDocuments({ parent: parent._id }), 2, 'failed kid is rolled back');
});

test('kid logs in with family code, username and PIN', async () => {
  const { parent, token } = await signupParent('family2@example.com');
  await api('POST', '/api/kids', {
    token,
    body: { name: 'Zawadi', age: 9, consent: true, username: 'zawadi', pin: '1234' }
  });

  const ok = await api('POST', '/api/auth/kid-login', {
    body: { familyCode: parent.familyCode.toLowerCase(), username: 'Zawadi', pin: '1234' }
  });
  assert.equal(ok.statusCode, 200, ok.body.message);
  assert.ok(ok.body.token);
  assert.equal(ok.body.data.role, 'kid');
  assert.equal(ok.body.data.username, 'zawadi');
  assert.equal(ok.body.data.email, undefined);

  const wrongFamily = await api('POST', '/api/auth/kid-login', {
    body: { familyCode: 'ZZZZZZ', username: 'zawadi', pin: '1234' }
  });
  assert.equal(wrongFamily.statusCode, 401);
});

test('too many wrong PINs lock the login until a parent resets it', async () => {
  const { parent, token } = await signupParent('family3@example.com');
  const added = await api('POST', '/api/kids', {
    token,
    body: { name: 'Juma', age: 7, consent: true, username: 'juma', pin: '1234' }
  });
  const login = (pin) => api('POST', '/api/auth/kid-login', {
    body: { familyCode: parent.familyCode, username: 'juma', pin }
  });

  for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
    assert.equal((await login('9999')).statusCode, 401);
  }
  assert.equal((await login('1234')).statusCode, 429, 'right PIN is refused while locked');

  const reset = await api('PUT', `/api/kids/${added.body.data._id}/login`, {
    token,
    body: { username: 'juma', pin: '5678' }
  });
  assert.equal(reset.statusCode, 200, reset.body.message);
  assert.equal((await login('5678')).statusCode, 200);
});

test('setting a login on an old email kid account removes the email', async () => {
  const { parent, token } = await signupParent('family4@example.com');
  const kid = await Kid.create({ name: 'Legacy', age: 10, parent: parent._id });
  const legacy = await User.create({
    email: 'legacy-kid@example.com',
    password: 'secret123',
    role: 'kid',
    parent: parent._id,
    kidProfile: kid._id
  });
  kid.account = legacy._id;
  await kid.save();

  const res = await api('PUT', `/api/kids/${kid._id}/login`, {
    token,
    body: { username: 'legacy', pin: '4321' }
  });
  assert.equal(res.statusCode, 200, res.body.message);

  const account = await User.findById(legacy._id);
  assert.equal(account.email, undefined);
  assert.equal(account.username, 'legacy');
});

test('parents can only see and change their own kids', async () => {
  const { token } = await signupParent('owner@example.com');
  const { token: otherToken } = await signupParent('other@example.com');
  const added = await api('POST', '/api/kids', {
    token,
    body: { name: 'Imani', age: 8, consent: true }
  });
  const path = `/api/kids/${added.body.data._id}`;

  assert.equal((await api('GET', path, { token: otherToken })).statusCode, 404);
  assert.equal((await api('PUT', path, { token: otherToken, body: { age: 9 } })).statusCode, 404);

  const updated = await api('PUT', path, { token, body: { age: 9 } });
  assert.equal(updated.statusCode, 200, updated.body.message);
  assert.equal(updated.body.data.age, 9);

  const badInterests = await api('PUT', path, { token, body: { interests: 'art' } });
  assert.equal(badInterests.statusCode, 400);
  assert.equal(badInterests.body.message, 'Interests must be an array');

  const list = await api('GET', '/api/kids', { token });
  assert.equal(list.body.count, 1);
  assert.equal(list.body.data[0].points, 0);
});

test('bad requests get a 400, not a 500', async () => {
  const { token } = await signupParent('badrequests@example.com');

  const badId = await api('GET', '/api/kids/not-an-id', { token });
  assert.equal(badId.statusCode, 400);
  assert.equal(badId.body.message, 'Invalid kid id');

  const badJson = await api('POST', '/api/kids', { token, rawBody: '{"name":' });
  assert.equal(badJson.statusCode, 400);

  // Fields Mongoose rejects come back as a validation message
  const badAge = await api('POST', '/api/kids', {
    token,
    body: { name: 'Too Old', age: 99, consent: true }
  });
  assert.equal(badAge.statusCode, 400);

  const kidOnly = await api('GET', '/api/kids/me', { token });
  assert.equal(kidOnly.statusCode, 403);
});

test('a kid can edit their avatar and interests', async () => {
  const { parent, token } = await signupParent('kidprofile@example.com');
  const { kidToken } = await addKidAndLogin(parent, token, { name: 'Wanjiru', username: 'wanjiru' });

  const updated = await api('PUT', '/api/kids/me', {
    token: kidToken,
    body: { interests: ['art'] }
  });
  assert.equal(updated.statusCode, 200, updated.body.message);
  assert.deepEqual(updated.body.data.interests, ['art']);

  const me = await api('GET', '/api/kids/me', { token: kidToken });
  assert.equal(me.body.data.name, 'Wanjiru');
});

test('deleting a kid or the parent account removes all kid data', async () => {
  const { parent, token } = await signupParent('family5@example.com');
  const ids = [];
  for (const [name, username] of [['Nia', 'nia'], ['Tumi', 'tumi']]) {
    const res = await api('POST', '/api/kids', {
      token,
      body: { name, age: 8, consent: true, username, pin: '1234' }
    });
    ids.push(res.body.data._id);
    await Completion.create({ kid: res.body.data._id, challengeId: 'backyard-bug-hunt' });
  }

  const first = await Kid.findById(ids[0]);
  const removed = await api('DELETE', `/api/kids/${ids[0]}`, { token });
  assert.equal(removed.statusCode, 200);
  assert.equal(await Kid.countDocuments({ _id: ids[0] }), 0);
  assert.equal(await User.countDocuments({ _id: first.account }), 0);
  assert.equal(await Completion.countDocuments({ kid: ids[0] }), 0);

  const gone = await api('DELETE', '/api/auth/me', { token });
  assert.equal(gone.statusCode, 200);
  assert.equal(await User.countDocuments({ $or: [{ _id: parent._id }, { parent: parent._id }] }), 0);
  assert.equal(await Kid.countDocuments({ parent: parent._id }), 0);
  assert.equal(await Completion.countDocuments({ kid: ids[1] }), 0);
});
