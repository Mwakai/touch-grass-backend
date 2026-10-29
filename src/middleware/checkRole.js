const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * Middleware to check if user has required role
 * Must be used after auth middleware
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Only ${allowedRoles.join(' or ')} can perform this action`
      );
    }

    next();
  };
};

module.exports = checkRole;
