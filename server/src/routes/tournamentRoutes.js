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
  allocateGroups,
  generateFixtures,
  getTournamentDetails,
  getTournamentStandings,
} = require('../controllers/tournamentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getTournaments);
router.get('/active', protect, getActiveTournament);
router.get('/upcoming', protect, getUpcomingTournament);
router.get('/:id', protect, getTournamentById);
router.get('/:id/details', protect, getTournamentDetails);
router.get('/:id/standings', protect, getTournamentStandings);

// Admin routes
router.use(protect, authorize('admin'));

router.post('/', createTournament);
router.put('/:id', updateTournament);
router.patch('/:id/status', updateTournamentStatus);
router.post('/reset-players', resetPlayersActiveState);
router.post('/:id/allocate-groups', allocateGroups);
router.post('/:id/generate-fixtures', generateFixtures);

module.exports = router;
