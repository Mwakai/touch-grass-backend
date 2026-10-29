const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { validate, validateObjectId } = require('../middleware/validate');
const rules = require('../validators/kids');
const {
  addKid,
  getKids,
  getKid,
  updateKid,
  deleteKid,
  setKidLogin,
  getMyProfile,
  updateMyProfile
} = require('../controllers/kidController');

// All routes require authentication
router.use(auth);

// Reject malformed ids before they reach the database
router.param('id', validateObjectId('Invalid kid id'));

// GET /api/kids/me - Kid views their own profile
router.get('/me', checkRole('kid'), getMyProfile);

// PUT /api/kids/me - Kid updates their own avatar and interests
router.put('/me', checkRole('kid'), validate(rules.updateMyProfile), updateMyProfile);

// Everything below is parent only
router.use(checkRole('parent'));

// POST /api/kids - Add a new kid
router.post('/', validate(rules.addKid), addKid);

// GET /api/kids - Get all kids for logged-in parent
router.get('/', getKids);

// GET /api/kids/:id - Get a single kid
router.get('/:id', getKid);

// PUT /api/kids/:id - Update a kid
router.put('/:id', validate(rules.updateKid), updateKid);

// PUT /api/kids/:id/login - Create or change a kid's username and PIN
router.put('/:id/login', validate(rules.setKidLogin), setKidLogin);

// DELETE /api/kids/:id - Delete a kid (and their login account, if any)
router.delete('/:id', deleteKid);

module.exports = router;
