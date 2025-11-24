const Kid = require('../models/Kid');
const User = require('../models/User');

/**
 * Add a new kid to parent's account
 * @route POST /api/kids
 * @access Private (Parent only)
 */
exports.addKid = async (req, res) => {
  try {
    const { name, age, avatarColor, interests } = req.body;
    const parentId = req.user._id;

    // Validate required fields
    if (!name || !age || !interests) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, age, and interests'
      });
    }

    // Validate interests is an array
    if (!Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Interests must be a non-empty array'
      });
    }

    // Create new kid
    const kid = await Kid.create({
      name,
      age,
      avatarColor: avatarColor || 'from-blue-400 to-purple-500',
      interests,
      parent: parentId
    });

    // Add kid to parent's kids array
    await User.findByIdAndUpdate(
      parentId,
      { $push: { kids: kid._id } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Kid added successfully',
      data: kid
    });
  } catch (error) {
    console.error('Add kid error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add kid'
    });
  }
};

/**
 * Get all kids for logged-in parent
 * @route GET /api/kids
 * @access Private (Parent only)
 */
exports.getKids = async (req, res) => {
  try {
    const parentId = req.user._id;

    const kids = await Kid.find({ parent: parentId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: kids.length,
      data: kids
    });
  } catch (error) {
    console.error('Get kids error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve kids'
    });
  }
};

/**
 * Get a single kid by ID
 * @route GET /api/kids/:id
 * @access Private (Parent only - own kids)
 */
exports.getKid = async (req, res) => {
  try {
    const kidId = req.params.id;
    const parentId = req.user._id;

    const kid = await Kid.findOne({ _id: kidId, parent: parentId });

    if (!kid) {
      return res.status(404).json({
        success: false,
        message: 'Kid not found'
      });
    }

    res.status(200).json({
      success: true,
      data: kid
    });
  } catch (error) {
    console.error('Get kid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve kid'
    });
  }
};

/**
 * Update a kid's information
 * @route PUT /api/kids/:id
 * @access Private (Parent only - own kids)
 */
exports.updateKid = async (req, res) => {
  try {
    const kidId = req.params.id;
    const parentId = req.user._id;
    const { name, age, avatarColor, interests } = req.body;

    // Find kid and ensure it belongs to the logged-in parent
    let kid = await Kid.findOne({ _id: kidId, parent: parentId });

    if (!kid) {
      return res.status(404).json({
        success: false,
        message: 'Kid not found'
      });
    }

    // Update fields if provided
    if (name !== undefined) kid.name = name;
    if (age !== undefined) kid.age = age;
    if (avatarColor !== undefined) kid.avatarColor = avatarColor;
    if (interests !== undefined) {
      if (!Array.isArray(interests) || interests.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Interests must be a non-empty array'
        });
      }
      kid.interests = interests;
    }

    await kid.save();

    res.status(200).json({
      success: true,
      message: 'Kid updated successfully',
      data: kid
    });
  } catch (error) {
    console.error('Update kid error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update kid'
    });
  }
};

/**
 * Delete a kid
 * @route DELETE /api/kids/:id
 * @access Private (Parent only - own kids)
 */
exports.deleteKid = async (req, res) => {
  try {
    const kidId = req.params.id;
    const parentId = req.user._id;

    // Find and delete kid
    const kid = await Kid.findOneAndDelete({ _id: kidId, parent: parentId });

    if (!kid) {
      return res.status(404).json({
        success: false,
        message: 'Kid not found'
      });
    }

    // Remove kid from parent's kids array
    await User.findByIdAndUpdate(
      parentId,
      { $pull: { kids: kidId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Kid deleted successfully'
    });
  } catch (error) {
    console.error('Delete kid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete kid'
    });
  }
};
