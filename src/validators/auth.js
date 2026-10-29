const { ForbiddenError } = require('../utils/errors');

/**
 * Request checks for /api/auth. Each returns an error message or null;
 * see src/middleware/validate.js.
 */

const isText = (value) => typeof value === 'string' && value.trim() !== '';

exports.signup = ({ email, password, role, consent }) => {
  // Kids can't sign up: a parent creates their login (PUT /api/kids/:id/login)
  if (role === 'kid') {
    throw new ForbiddenError('Kids can\'t sign up on their own. Ask a parent to create your login.');
  }
  if (role && role !== 'parent') return 'Role must be "parent"';
  if (!isText(email) || !isText(password)) return 'Please provide email and password';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  if (consent !== true) return 'Please accept the privacy policy to create an account';
  return null;
};

exports.login = ({ email, password }) => {
  if (!isText(email) || !isText(password)) return 'Please provide email and password';
  return null;
};

exports.kidLogin = ({ familyCode, username, pin }) => {
  if (!familyCode || !username || !pin) {
    return 'Please provide family code, username and PIN';
  }
  return null;
};
