const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats/:tournamentId/leaderboards
router.get('/:tournamentId/leaderboards', statsController.getTournamentLeaderboards);

module.exports = router;
