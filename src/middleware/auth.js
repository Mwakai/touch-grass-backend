const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware to protect routes
 * Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Use: Bearer <token>'
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token found'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by id from token payload
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Attach user to request object
      req.user = user;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = auth;
