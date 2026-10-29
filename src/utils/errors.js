/**
 * Errors services throw when a request can't go ahead. Each one carries the
 * HTTP status and a message that is safe to show the user; the error handler
 * (src/middleware/errorHandler.js) turns them into the JSON response.
 */
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(400, message);
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(401, message);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(403, message);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(404, message);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(409, message);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message) {
    super(429, message);
  }
}

/**
 * Whether an error is MongoDB's duplicate key error, optionally on one field
 * @param {Error} error
 * @param {string} [field] - Only match a clash on this field's index
 */
const isDuplicateKey = (error, field) =>
  error.code === 11000 &&
  (!field || Boolean(error.keyPattern && error.keyPattern[field]));

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  isDuplicateKey
};
