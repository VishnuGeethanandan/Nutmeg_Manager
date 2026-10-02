const express = require('express');
const {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
} = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');

const {
  getCaptainTeam,
  getEligiblePlayers,
  addPlayerToSquad,
  removePlayerFromSquad
} = require('../controllers/squadController');

const router = express.Router();

// Captain (Player) routes for squad management
router.get('/:teamId/members', protect, authorize('player'), getCaptainTeam);
router.get('/:teamId/eligible-players', protect, authorize('player'), getEligiblePlayers);
router.post('/:teamId/members', protect, authorize('player'), addPlayerToSquad);
router.delete('/:teamId/members/:playerId', protect, authorize('player'), removePlayerFromSquad);

// Only admin routes for Team management in Module 3
router.post('/', protect, authorize('admin'), createTeam);
router.get('/', protect, getTeams);
router.get('/:id', protect, authorize('admin'), getTeamById);
router.patch('/:id', protect, authorize('admin'), updateTeam);

module.exports = router;
