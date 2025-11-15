const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getCurrentUser,
  logout
} = require('../controllers/authController');
const auth = require('../middleware/auth');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private (requires authentication)
 */
router.get('/me', auth, getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

module.exports = router;
