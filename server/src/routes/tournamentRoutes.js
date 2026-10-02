const express = require('express');
const {
  getTournaments,
  getActiveTournament,
  getUpcomingTournament,
  getTournamentById,
  createTournament,
  updateTournament,
  updateTournamentStatus,
  resetPlayersActiveState,
} = require('../controllers/tournamentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getTournaments);
router.get('/active', protect, getActiveTournament);
router.get('/upcoming', protect, getUpcomingTournament);
router.get('/:id', protect, getTournamentById);

// Admin routes
router.use(protect, authorize('admin'));

router.post('/', createTournament);
router.put('/:id', updateTournament);
router.patch('/:id/status', updateTournamentStatus);
router.post('/reset-players', resetPlayersActiveState);

module.exports = router;
