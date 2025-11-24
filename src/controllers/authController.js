const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Kid = require('../models/Kid');

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
    const { email, password, role, familyCode, name, age } = req.body;

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

    // If signing up as a kid, validate required fields
    if (role === 'kid') {
      if (!familyCode) {
        return res.status(400).json({
          success: false,
          message: 'Family code is required for kid signup'
        });
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for kid signup'
        });
      }

      if (!age) {
        return res.status(400).json({
          success: false,
          message: 'Age is required for kid signup'
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    let parentUser = null;
    let userFamilyCode = null;

    // Handle role-specific logic
    if (role === 'kid') {
      // Find parent by family code
      parentUser = await User.findOne({ familyCode: familyCode.toUpperCase() });
      if (!parentUser) {
        return res.status(400).json({
          success: false,
          message: 'Invalid family code. Please check with your parent.'
        });
      }
    } else {
      // Generate unique family code for parent
      let isUnique = false;
      while (!isUnique) {
        userFamilyCode = User.generateFamilyCode();
        const existing = await User.findOne({ familyCode: userFamilyCode });
        if (!existing) isUnique = true;
      }
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      role: role || 'parent',
      // Parents get their own code, kids get their parent's code
      familyCode: role === 'kid' ? parentUser.familyCode : userFamilyCode,
      parent: parentUser ? parentUser._id : undefined,
      name: role === 'kid' ? name : undefined
    });

    // If kid signup, also create Kid document and link to parent
    let kidDoc = null;
    if (role === 'kid' && parentUser) {
      // Create Kid document
      kidDoc = await Kid.create({
        name,
        age,
        parent: parentUser._id
      });

      // Add kid to parent's kids array
      await User.findByIdAndUpdate(
        parentUser._id,
        { $push: { kids: kidDoc._id } },
        { new: true }
      );
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Build response data
    const responseData = {
      id: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    // Include family code for parents
    if (user.role === 'parent') {
      responseData.familyCode = user.familyCode;
    }

    // Include name and parent info for kids
    if (user.role === 'kid') {
      responseData.name = user.name;
      responseData.parentId = user.parent;
      responseData.kidId = kidDoc ? kidDoc._id : undefined;
      responseData.age = age;
    }

    // Return response
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      data: responseData
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

    // Build response data
    const responseData = {
      id: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    // Include role-specific data
    if (user.role === 'parent') {
      responseData.familyCode = user.familyCode;
      responseData.kids = user.kids;
    } else if (user.role === 'kid') {
      responseData.name = user.name;
      responseData.parent = user.parent;
    }

    res.status(200).json({
      success: true,
      data: responseData
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
