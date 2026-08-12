const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getCaptainTeam,
  getEligiblePlayers,
  addPlayerToSquad,
  removePlayerFromSquad
} = require('../controllers/squadController');

// All squad routes require authentication and 'player' role
// Note: controllers will further enforce that the player is a captain
router.use(protect, authorize('player'));

router.get('/my-team', getCaptainTeam);
router.get('/eligible-players', getEligiblePlayers);
router.post('/roster', addPlayerToSquad);
router.delete('/roster/:playerId', removePlayerFromSquad);

module.exports = router;
