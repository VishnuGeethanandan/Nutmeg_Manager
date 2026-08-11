const Tournament = require('../models/Tournament');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public (or authenticated)
const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find().sort({ year: -1 });
    res.status(200).json({
      success: true,
      tournaments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTournaments,
};
