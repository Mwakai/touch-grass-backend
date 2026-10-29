const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  kidLogin,
  getCurrentUser,
  deleteAccount,
  logout
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { validate } = require('../middleware/validate');
const rules = require('../validators/auth');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', validate(rules.signup), signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validate(rules.login), login);

/**
 * @route   POST /api/auth/kid-login
 * @desc    Kid login with family code, username and PIN
 * @access  Public
 */
router.post('/kid-login', validate(rules.kidLogin), kidLogin);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private (requires authentication)
 */
router.get('/me', auth, getCurrentUser);

/**
 * @route   DELETE /api/auth/me
 * @desc    Delete the parent's account and all their kids' data
 * @access  Private (Parent only)
 */
router.delete('/me', auth, checkRole('parent'), deleteAccount);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

module.exports = router;
