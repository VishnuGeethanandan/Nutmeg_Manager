const Match = require('../models/Match');

// @desc    Update match details (schedule, goals, cards, status)
// @route   PUT /api/matches/:id
// @access  Private/Admin
const updateMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const { matchDate, status, team1Goals, team2Goals, team1Cards, team2Cards } = req.body;

    if (matchDate !== undefined) match.matchDate = matchDate;
    if (status !== undefined) match.status = status;
    if (team1Goals !== undefined) match.team1Goals = team1Goals;
    if (team2Goals !== undefined) match.team2Goals = team2Goals;
    if (team1Cards !== undefined) match.team1Cards = team1Cards;
    if (team2Cards !== undefined) match.team2Cards = team2Cards;

    await match.save();

    res.status(200).json({
      success: true,
      data: match,
      message: 'Match updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateMatch,
};
