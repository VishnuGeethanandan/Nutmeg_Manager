const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const PlayerTournamentStats = require('../models/PlayerTournamentStats');


// @desc    Update match details (schedule, goals, cards, status)
// @route   PUT /api/matches/:id
// @access  Private/Admin
const updateMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const { matchDate, status, team1Goals, team2Goals, team1Cards, team2Cards, team1Penalties, team2Penalties, playerStatsUpdates } = req.body;


    if (matchDate !== undefined) match.matchDate = matchDate;
    if (status !== undefined) match.status = status;
    if (team1Goals !== undefined) match.team1Goals = team1Goals;
    if (team2Goals !== undefined) match.team2Goals = team2Goals;
    if (team1Cards !== undefined) match.team1Cards = team1Cards;
    if (team2Cards !== undefined) match.team2Cards = team2Cards;
    if (team1Penalties !== undefined) match.team1Penalties = team1Penalties;
    if (team2Penalties !== undefined) match.team2Penalties = team2Penalties;

    await match.save();

    // Revert old stats if they exist
    if (match.playerStats && match.playerStats.length > 0) {
      for (const stat of match.playerStats) {
        const decData = {};
        if (stat.goals) decData.goals = -stat.goals;
        if (stat.assists) decData.assists = -stat.assists;
        if (stat.yellowCards) decData.yellowCards = -stat.yellowCards;
        if (stat.redCards) decData.redCards = -stat.redCards;
        
        if (Object.keys(decData).length > 0) {
          await PlayerTournamentStats.findOneAndUpdate(
            { tournamentId: match.tournamentId, playerId: stat.playerId },
            { $inc: decData }
          );
        }
      }
    }

    // Consolidate new stats from req.body
    const consolidatedStats = {};
    if (playerStatsUpdates && Array.isArray(playerStatsUpdates)) {
      for (const stat of playerStatsUpdates) {
        if (!stat.playerId) continue;
        const pid = stat.playerId.toString();
        if (!consolidatedStats[pid]) {
          consolidatedStats[pid] = { playerId: pid, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
        }
        if (stat.goals) consolidatedStats[pid].goals += stat.goals;
        if (stat.assists) consolidatedStats[pid].assists += stat.assists;
        if (stat.yellowCards) consolidatedStats[pid].yellowCards += stat.yellowCards;
        if (stat.redCards) consolidatedStats[pid].redCards += stat.redCards;
      }
    }

    const newMatchStats = Object.values(consolidatedStats);
    
    // Assign new stats to the match document
    match.playerStats = newMatchStats;

    // Apply new stats to PlayerTournamentStats
    for (const stat of newMatchStats) {
      const incData = {};
      if (stat.goals) incData.goals = stat.goals;
      if (stat.assists) incData.assists = stat.assists;
      if (stat.yellowCards) incData.yellowCards = stat.yellowCards;
      if (stat.redCards) incData.redCards = stat.redCards;
      
      // If it's a new entry (not just zeros), and we want to ensure matchesPlayed is set...
      incData.matchesPlayed = 1; // Simplified: we can just ensure they get a match played credit

      await PlayerTournamentStats.findOneAndUpdate(
        { tournamentId: match.tournamentId, playerId: stat.playerId },
        { $inc: incData },
        { upsert: true, new: true }
      );
    }

    await match.save();

    if (match.group === 'Final' && match.status === 'completed') {
      const tournament = await Tournament.findById(match.tournamentId);
      if (tournament && tournament.status !== 'completed') {
        tournament.status = 'completed';
        await tournament.save();
      }
    }

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
