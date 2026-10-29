const authService = require('../services/authService');

/**
 * HTTP handlers for /api/auth. Input is checked by src/validators/auth.js,
 * the work happens in src/services/authService.js, and errors go to
 * src/middleware/errorHandler.js.
 */

/**
 * @desc    Register a new parent
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = async (req, res) => {
  const { token, user } = await authService.signup(req.body);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    token,
    data: user
  });
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  const { token, user } = await authService.login(req.body);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    data: user
  });
};

/**
 * @desc    Kid login with the family code, the username and PIN their parent set
 * @route   POST /api/auth/kid-login
 * @access  Public
 */
const kidLogin = async (req, res) => {
  const { token, user } = await authService.kidLogin(req.body);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    data: user
  });
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    data: await authService.getCurrentUser(req.user._id)
  });
};

/**
 * @desc    Delete the logged-in parent's account and everything about their
 *          kids: profiles, kid logins and game progress
 * @route   DELETE /api/auth/me
 * @access  Private (Parent only)
 */
const deleteAccount = async (req, res) => {
  await authService.deleteAccount(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Account and all kid data deleted'
  });
};

/**
 * @desc    Logout user. Tokens are stateless JWTs, so the client logs out
 *          by removing its token
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.'
  });
};

module.exports = {
  signup,
  login,
  kidLogin,
  getCurrentUser,
  deleteAccount,
  logout
};
