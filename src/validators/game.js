/**
 * Request checks for /api/game. Each returns an error message or null;
 * see src/middleware/validate.js.
 */

exports.submitChallenge = ({ note }) =>
  note !== undefined && typeof note !== 'string' ? 'Note must be text' : null;

exports.reviewCompletion = ({ decision }) =>
  ['approve', 'reject'].includes(decision) ? null : "Decision must be 'approve' or 'reject'";
