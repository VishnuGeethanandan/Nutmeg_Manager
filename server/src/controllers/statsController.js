const PlayerTournamentStats = require('../models/PlayerTournamentStats');

/**
 * @route GET /api/stats/:tournamentId/leaderboards
 * @desc Get top scorers and top assists for a tournament
 * @access Public (or Private depending on requirements, usually public for leaderboards)
 */
exports.getTournamentLeaderboards = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;

    // Fetch top scorers
    const topScorers = await PlayerTournamentStats.find({ tournamentId, goals: { $gt: 0 } })
      .sort({ goals: -1, assists: -1 })
      .limit(10)
      .populate('playerId', 'name admissionNumber departmentName position photo');

    // Fetch top assists
    const topAssists = await PlayerTournamentStats.find({ tournamentId, assists: { $gt: 0 } })
      .sort({ assists: -1, goals: -1 })
      .limit(10)
      .populate('playerId', 'name admissionNumber departmentName position photo');

    res.status(200).json({
      success: true,
      data: {
        topScorers,
        topAssists,
      },
    });
  } catch (error) {
    next(error);
  }
};
