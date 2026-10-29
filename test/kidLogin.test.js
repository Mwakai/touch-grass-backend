const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_FAILED_LOGINS,
  LOCK_MINUTES,
  normalizeUsername,
  isValidUsername,
  isValidPin,
  credentialsError,
  isLocked,
  afterFailedLogin
} = require('../src/utils/kidLogin');

test('usernames are trimmed and lowercased', () => {
  assert.equal(normalizeUsername('  Amara_7 '), 'amara_7');
  assert.equal(normalizeUsername(undefined), '');
});

test('usernames are 3 to 20 letters, numbers or underscores', () => {
  assert.ok(isValidUsername('amara'));
  assert.ok(isValidUsername('Big_Explorer_2'));
  assert.ok(!isValidUsername('ab'));
  assert.ok(!isValidUsername('a'.repeat(21)));
  assert.ok(!isValidUsername('amara@home.com'));
  assert.ok(!isValidUsername('two words'));
});

test('PINs are exactly 4 digits, given as a string', () => {
  assert.ok(isValidPin('0420'));
  assert.ok(!isValidPin('123'));
  assert.ok(!isValidPin('12345'));
  assert.ok(!isValidPin('12a4'));
  // A number would lose leading zeros, so clients must send a string
  assert.ok(!isValidPin(1234));
});

test('credentialsError names the first problem, or null', () => {
  assert.equal(credentialsError('amara', '1234'), null);
  assert.match(credentialsError('a', '1234'), /Username/);
  assert.match(credentialsError('amara', '12'), /PIN/);
});

test('wrong PINs count up, then lock the account', () => {
  const now = new Date('2026-10-28T10:00:00Z');
  let state = { failedLogins: 0, lockedUntil: null };

  for (let i = 1; i < MAX_FAILED_LOGINS; i++) {
    state = afterFailedLogin(state.failedLogins, now);
    assert.deepEqual(state, { failedLogins: i, lockedUntil: null });
  }

  state = afterFailedLogin(state.failedLogins, now);
  assert.equal(state.failedLogins, 0);
  assert.equal(state.lockedUntil.getTime() - now.getTime(), LOCK_MINUTES * 60 * 1000);
});

test('a lock only applies until it runs out', () => {
  const now = new Date('2026-10-28T10:00:00Z');
  assert.ok(isLocked(new Date('2026-10-28T10:05:00Z'), now));
  assert.ok(!isLocked(new Date('2026-10-28T09:55:00Z'), now));
  assert.ok(!isLocked(null, now));
  assert.ok(!isLocked(undefined, now));
});
