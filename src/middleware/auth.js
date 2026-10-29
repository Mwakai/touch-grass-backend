const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Authentication middleware to protect routes
 * Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
  // Get token from header
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    throw new UnauthorizedError('No authorization token provided');
  }

  // Check if token starts with 'Bearer '
  if (!authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Invalid token format. Use: Bearer <token>');
  }

  // Extract token (remove 'Bearer ' prefix)
  const token = authHeader.substring(7);

  if (!token) {
    throw new UnauthorizedError('No token found');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }

  // Find user by id from token payload
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Attach user to request object
  req.user = user;

  next();
};

module.exports = auth;
