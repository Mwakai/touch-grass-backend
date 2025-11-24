const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const {
  addKid,
  getKids,
  getKid,
  updateKid,
  deleteKid
} = require('../controllers/kidController');

// All routes require authentication and parent role
router.use(auth);
router.use(checkRole('parent'));

// POST /api/kids - Add a new kid
router.post('/', addKid);

// GET /api/kids - Get all kids for logged-in parent
router.get('/', getKids);

// GET /api/kids/:id - Get a single kid
router.get('/:id', getKid);

// PUT /api/kids/:id - Update a kid
router.put('/:id', updateKid);

// DELETE /api/kids/:id - Delete a kid
router.delete('/:id', deleteKid);

module.exports = router;
