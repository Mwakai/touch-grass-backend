const kidService = require('../services/kidService');

/**
 * HTTP handlers for /api/kids. Input is checked by src/validators/kids.js,
 * the work happens in src/services/kidService.js, and errors go to
 * src/middleware/errorHandler.js.
 */

/**
 * Add a new kid to parent's account
 * @route POST /api/kids
 * @access Private (Parent only)
 */
exports.addKid = async (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Kid added successfully',
    data: await kidService.addKid(req.user, req.body)
  });
};

/**
 * Get all kids for logged-in parent
 * @route GET /api/kids
 * @access Private (Parent only)
 */
exports.getKids = async (req, res) => {
  const kids = await kidService.listKids(req.user._id);

  res.status(200).json({
    success: true,
    count: kids.length,
    data: kids
  });
};

/**
 * Get a single kid by ID
 * @route GET /api/kids/:id
 * @access Private (Parent only - own kids)
 */
exports.getKid = async (req, res) => {
  res.status(200).json({
    success: true,
    data: await kidService.getKid(req.user._id, req.params.id)
  });
};

/**
 * Update a kid's information
 * @route PUT /api/kids/:id
 * @access Private (Parent only - own kids)
 */
exports.updateKid = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Kid updated successfully',
    data: await kidService.updateKid(req.user._id, req.params.id, req.body)
  });
};

/**
 * Delete a kid
 * @route DELETE /api/kids/:id
 * @access Private (Parent only - own kids)
 */
exports.deleteKid = async (req, res) => {
  await kidService.deleteKid(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Kid deleted successfully'
  });
};

/**
 * Create a login for a kid, or change their username or PIN. Also clears a
 * PIN lock, so this is how a parent resets a forgotten PIN.
 * @route PUT /api/kids/:id/login
 * @access Private (Parent only - own kids)
 */
exports.setKidLogin = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Login saved. Your kid can now log in with your family code, this username and PIN.',
    data: await kidService.setKidLogin(req.user, req.params.id, req.body)
  });
};

/**
 * Get the logged-in kid's own profile
 * @route GET /api/kids/me
 * @access Private (Kid only)
 */
exports.getMyProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    data: await kidService.getMyProfile(req.user._id)
  });
};

/**
 * Update the logged-in kid's own profile (avatar and interests only;
 * name and age are managed by the parent)
 * @route PUT /api/kids/me
 * @access Private (Kid only)
 */
exports.updateMyProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: await kidService.updateMyProfile(req.user._id, req.body)
  });
};
