const express = require('express');
const router = express.Router();
const { DEPARTMENTS, POSITIONS } = require('../config/departments');

/**
 * @desc    Get list of valid departments
 * @route   GET /api/config/departments
 * @access  Public
 */
router.get('/departments', (_req, res) => {
  res.json({ success: true, departments: DEPARTMENTS });
});

/**
 * @desc    Get list of valid positions
 * @route   GET /api/config/positions
 * @access  Public
 */
router.get('/positions', (_req, res) => {
  res.json({ success: true, positions: POSITIONS });
});

module.exports = router;
