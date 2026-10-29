const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { validate, validateObjectId } = require('../middleware/validate');
const rules = require('../validators/game');
const {
  getMyAdventure,
  submitChallenge,
  getKidAdventure,
  getPending,
  reviewCompletion
} = require('../controllers/gameController');

// All routes require authentication
router.use(auth);

// Reject malformed ids before they reach the database
router.param('id', validateObjectId());

// GET /api/game/me - Kid's own adventure
router.get('/me', checkRole('kid'), getMyAdventure);

// POST /api/game/me/challenges/:challengeId - Kid submits a challenge
router.post(
  '/me/challenges/:challengeId',
  checkRole('kid'),
  validate(rules.submitChallenge),
  submitChallenge
);

// GET /api/game/pending - Parent's approval queue
router.get('/pending', checkRole('parent'), getPending);

// GET /api/game/kids/:id - Parent views a kid's adventure
router.get('/kids/:id', checkRole('parent'), getKidAdventure);

// POST /api/game/completions/:id/review - Parent approves or rejects
router.post(
  '/completions/:id/review',
  checkRole('parent'),
  validate(rules.reviewCompletion),
  reviewCompletion
);

module.exports = router;
