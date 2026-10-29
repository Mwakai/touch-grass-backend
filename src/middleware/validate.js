const mongoose = require('mongoose');
const { ValidationError } = require('../utils/errors');

/**
 * Run a check on the request before the controller. The check gets the body
 * and the request, and returns an error message or null. A request without a
 * body gets an empty one, so controllers after this can always read req.body.
 * @param {(body: Object, req: Object) => string|null} check
 */
const validate = (check) => (req, res, next) => {
  req.body = req.body || {};
  const message = check(req.body, req);
  next(message ? new ValidationError(message) : undefined);
};

/**
 * router.param handler that rejects malformed ids before they reach the database
 * @param {string} message - Error message for a bad id
 */
const validateObjectId = (message = 'Invalid id') => (req, res, next, id) => {
  next(mongoose.isObjectIdOrHexString(id) ? undefined : new ValidationError(message));
};

module.exports = {
  validate,
  validateObjectId
};
