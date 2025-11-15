const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate role if provided
    if (role && !['parent', 'kid'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "parent" or "kid"'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      role: role || 'parent'
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Return response
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Signup error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email and explicitly select password field
    const user = await User.findOne({
      email: email.toLowerCase().trim()
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Return response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        kids: user.kids,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res) => {
  try {
    // In a stateless JWT setup, logout is handled client-side
    // The client should remove the token from storage
    // Optionally, you could implement token blacklisting here

    res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove the token from client storage.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

module.exports = {
  signup,
  login,
  getCurrentUser,
  logout
};
