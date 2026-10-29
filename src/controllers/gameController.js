const gameService = require('../services/gameService');

/**
 * HTTP handlers for /api/game. Input is checked by src/validators/game.js,
 * the work happens in src/services/gameService.js, and errors go to
 * src/middleware/errorHandler.js.
 */

/**
 * Get the logged-in kid's adventure: XP, level, streak, badges and trail
 * @route GET /api/game/me
 * @access Private (Kid only)
 */
exports.getMyAdventure = async (req, res) => {
  res.status(200).json({
    success: true,
    data: await gameService.getMyAdventure(req.user._id)
  });
};

/**
 * Kid says they've done a challenge; it waits for a parent to approve
 * @route POST /api/game/me/challenges/:challengeId
 * @access Private (Kid only)
 */
exports.submitChallenge = async (req, res) => {
  const { note } = req.body;

  res.status(201).json({
    success: true,
    message: 'Nice work! A grown-up will check it soon.',
    data: await gameService.submitChallenge(req.user._id, req.params.challengeId, note)
  });
};

/**
 * Parent views one of their kids' adventures
 * @route GET /api/game/kids/:id
 * @access Private (Parent only - own kids)
 */
exports.getKidAdventure = async (req, res) => {
  res.status(200).json({
    success: true,
    data: await gameService.getKidAdventure(req.user._id, req.params.id)
  });
};

/**
 * Challenges the parent's kids have submitted and are waiting for approval
 * @route GET /api/game/pending
 * @access Private (Parent only)
 */
exports.getPending = async (req, res) => {
  const pending = await gameService.listPending(req.user._id);

  res.status(200).json({
    success: true,
    count: pending.length,
    data: pending
  });
};

/**
 * Parent approves or rejects a pending completion
 * @route POST /api/game/completions/:id/review
 * @body { decision: 'approve' | 'reject' }
 * @access Private (Parent only - own kids)
 */
exports.reviewCompletion = async (req, res) => {
  const { decision } = req.body;

  res.status(200).json({
    success: true,
    message: decision === 'approve' ? 'Challenge approved' : 'Challenge sent back',
    data: await gameService.reviewCompletion(req.user._id, req.params.id, decision)
  });
};
