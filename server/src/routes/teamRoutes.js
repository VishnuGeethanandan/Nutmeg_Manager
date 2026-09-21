const express = require('express');
const {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
} = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Only admin routes for Team management in Module 3
router.post('/', protect, authorize('admin'), createTeam);
router.get('/', protect, getTeams);
router.get('/:id', protect, authorize('admin'), getTeamById);
router.patch('/:id', protect, authorize('admin'), updateTeam);

module.exports = router;
