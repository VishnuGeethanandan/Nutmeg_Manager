const express = require('express');
const { getTournaments } = require('../controllers/tournamentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getTournaments);

module.exports = router;
