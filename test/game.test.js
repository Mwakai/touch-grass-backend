const { test } = require('node:test');
const assert = require('node:assert/strict');
const { api, signupParent, addKidAndLogin } = require('./helpers/api');

const CHALLENGE = 'backyard-bug-hunt';

test('a kid submits a challenge and their parent approves it', async () => {
  const { parent, token } = await signupParent('game1@example.com');
  const { kidId, kidToken } = await addKidAndLogin(parent, token, { name: 'Kito', username: 'kito' });

  const submitted = await api('POST', `/api/game/me/challenges/${CHALLENGE}`, {
    token: kidToken,
    body: { note: 'Found a ladybird' }
  });
  assert.equal(submitted.statusCode, 201, submitted.body.message);
  assert.equal(submitted.body.data.stats.pending, 1);

  const again = await api('POST', `/api/game/me/challenges/${CHALLENGE}`, { token: kidToken });
  assert.equal(again.statusCode, 409);
  assert.equal(again.body.message, 'This challenge is already waiting for a grown-up to check');

  const pending = await api('GET', '/api/game/pending', { token });
  assert.equal(pending.statusCode, 200);
  assert.equal(pending.body.count, 1);
  assert.equal(pending.body.data[0].note, 'Found a ladybird');
  assert.equal(pending.body.data[0].challenge.id, CHALLENGE);

  const reviewPath = `/api/game/completions/${pending.body.data[0].id}/review`;
  const approved = await api('POST', reviewPath, { token, body: { decision: 'approve' } });
  assert.equal(approved.statusCode, 200, approved.body.message);
  assert.equal(approved.body.message, 'Challenge approved');
  assert.ok(approved.body.data.xp > 0);

  const twice = await api('POST', reviewPath, { token, body: { decision: 'reject' } });
  assert.equal(twice.statusCode, 409);

  const adventure = await api('GET', `/api/game/kids/${kidId}`, { token });
  assert.equal(adventure.body.data.xp, approved.body.data.xp);

  const done = await api('POST', `/api/game/me/challenges/${CHALLENGE}`, { token: kidToken });
  assert.equal(done.statusCode, 409);
  assert.equal(done.body.message, 'You already completed this challenge');
});

test('game requests are checked before they reach the database', async () => {
  const { parent, token } = await signupParent('game2@example.com');
  const { kidToken } = await addKidAndLogin(parent, token, { name: 'Lulu', username: 'lulu' });

  const unknown = await api('POST', '/api/game/me/challenges/no-such-challenge', { token: kidToken });
  assert.equal(unknown.statusCode, 404);

  const badNote = await api('POST', `/api/game/me/challenges/${CHALLENGE}`, {
    token: kidToken,
    body: { note: 42 }
  });
  assert.equal(badNote.statusCode, 400);
  assert.equal(badNote.body.message, 'Note must be text');

  const badDecision = await api('POST', '/api/game/completions/64b000000000000000000000/review', {
    token,
    body: { decision: 'maybe' }
  });
  assert.equal(badDecision.statusCode, 400);

  const missing = await api('POST', '/api/game/completions/64b000000000000000000000/review', {
    token,
    body: { decision: 'approve' }
  });
  assert.equal(missing.statusCode, 404);

  const parentOnly = await api('GET', '/api/game/pending', { token: kidToken });
  assert.equal(parentOnly.statusCode, 403);
});

test('a parent cannot review another family\'s challenge', async () => {
  const { parent, token } = await signupParent('game3@example.com');
  const { token: otherToken } = await signupParent('game4@example.com');
  const { kidToken } = await addKidAndLogin(parent, token, { name: 'Pendo', username: 'pendo' });

  await api('POST', `/api/game/me/challenges/${CHALLENGE}`, { token: kidToken });
  const pending = await api('GET', '/api/game/pending', { token });

  const res = await api('POST', `/api/game/completions/${pending.body.data[0].id}/review`, {
    token: otherToken,
    body: { decision: 'approve' }
  });
  assert.equal(res.statusCode, 404);
});
