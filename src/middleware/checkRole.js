/**
 * Middleware to check if user has required role
 * Must be used after auth middleware
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Only ${allowedRoles.join(' or ')} can perform this action`
      });
    }

    next();
  };
};

module.exports = checkRole;
