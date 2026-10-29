/**
 * Rules for kid logins. Kids never give us an email address: a parent picks a
 * username and a 4-digit PIN, and the kid logs in with those plus the family
 * code. A PIN only has 10,000 values, so repeated wrong guesses lock the
 * account for a while.
 */

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const PIN_PATTERN = /^\d{4}$/;

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const normalizeUsername = (username) =>
  typeof username === 'string' ? username.trim().toLowerCase() : '';

const isValidUsername = (username) => USERNAME_PATTERN.test(normalizeUsername(username));

const isValidPin = (pin) => typeof pin === 'string' && PIN_PATTERN.test(pin);

/**
 * Check a kid's username and PIN before they are saved
 * @returns {string|null} An error message, or null when both are fine
 */
const credentialsError = (username, pin) => {
  if (!isValidUsername(username)) {
    return 'Username must be 3 to 20 letters, numbers or underscores';
  }
  if (!isValidPin(pin)) {
    return 'PIN must be exactly 4 digits';
  }
  return null;
};

const isLocked = (lockedUntil, now = new Date()) =>
  Boolean(lockedUntil) && lockedUntil > now;

/**
 * Work out the lock state after a wrong PIN
 * @param {number} failedLogins - Wrong attempts before this one
 * @returns {{ failedLogins: number, lockedUntil: Date|null }}
 */
const afterFailedLogin = (failedLogins = 0, now = new Date()) => {
  const failed = failedLogins + 1;
  if (failed < MAX_FAILED_LOGINS) {
    return { failedLogins: failed, lockedUntil: null };
  }
  // Locked: the count starts again once the lock runs out
  return {
    failedLogins: 0,
    lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60 * 1000)
  };
};

module.exports = {
  MAX_FAILED_LOGINS,
  LOCK_MINUTES,
  normalizeUsername,
  isValidUsername,
  isValidPin,
  credentialsError,
  isLocked,
  afterFailedLogin
};
