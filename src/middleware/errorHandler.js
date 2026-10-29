const { AppError, isDuplicateKey } = require('../utils/errors');

/**
 * The one place errors become responses. Express 5 sends errors thrown in
 * async handlers here, so controllers don't need their own try/catch.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const send = (status, message) =>
    res.status(status).json({ success: false, message });

  if (err instanceof AppError) {
    return send(err.status, err.message);
  }

  // Mongoose schema validation failed
  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return send(400, messages.join(', '));
  }

  // Malformed ObjectId or other value Mongoose couldn't cast
  if (err.name === 'CastError') {
    return send(400, `Invalid ${err.path}`);
  }

  // A duplicate the service didn't expect, such as a race on a unique index
  if (isDuplicateKey(err)) {
    return send(409, 'That already exists');
  }

  // Body that isn't valid JSON
  if (err.type === 'entity.parse.failed') {
    return send(400, 'Request body must be valid JSON');
  }

  // Other client errors from Express itself, such as a body that's too large
  if (err.expose && err.status >= 400 && err.status < 500) {
    return send(err.status, err.message);
  }

  // Anything else is a bug or an outage: log it, but don't leak the details
  console.error(`${req.method} ${req.originalUrl} error:`, err);
  send(500, 'Something went wrong. Please try again.');
};

module.exports = errorHandler;
