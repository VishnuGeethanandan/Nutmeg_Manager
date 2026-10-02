const express = require('express');
const { updateMatch } = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.put('/:id', updateMatch);

module.exports = router;
