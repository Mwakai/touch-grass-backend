const { credentialsError } = require('../utils/kidLogin');

/**
 * Request checks for /api/kids. Each returns an error message or null;
 * see src/middleware/validate.js.
 */

// Interests are optional, but must be an array when given
const interestsError = (interests) =>
  interests !== undefined && !Array.isArray(interests) ? 'Interests must be an array' : null;

exports.addKid = ({ name, age, interests, consent, username, pin }) => {
  if (!name || !age) return 'Please provide name and age';
  if (consent !== true) {
    return 'Please confirm you are this child\'s parent or guardian and agree to the privacy policy';
  }
  // A login is optional here; the parent can add one later
  if (username !== undefined || pin !== undefined) {
    const message = credentialsError(username, pin);
    if (message) return message;
  }
  return interestsError(interests);
};

exports.updateKid = ({ interests }) => interestsError(interests);

exports.setKidLogin = ({ username, pin }) => credentialsError(username, pin);

exports.updateMyProfile = ({ interests }) => interestsError(interests);
