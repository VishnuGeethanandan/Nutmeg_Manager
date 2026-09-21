const Tournament = require('../models/Tournament');
const Player = require('../models/Player');
const User = require('../models/User');
const Team = require('../models/Team');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public (or authenticated)
const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find().sort({ year: -1 });
    res.status(200).json({
      success: true,
      data: tournaments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active tournament
// @route   GET /api/tournaments/active
// @access  Public
const getActiveTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findOne({
      status: { $in: ['upcoming', 'ongoing'] },
    }).sort({ year: -1 });

    if (!tournament) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tournament
// @route   GET /api/tournaments/:id
// @access  Public
const getTournamentById = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new tournament
// @route   POST /api/tournaments
// @access  Private/Admin
const createTournament = async (req, res, next) => {
  try {
    // Check if there is already an active tournament
    const activeTournament = await Tournament.findOne({
      status: { $in: ['upcoming', 'ongoing'] },
    });

    if (activeTournament) {
      return res.status(400).json({
        success: false,
        message: `Cannot create new tournament. ${activeTournament.name} is currently ${activeTournament.status}.`,
      });
    }

    const { name, year, teamNames } = req.body;
    
    if (!name || !year) {
      return res.status(400).json({ success: false, message: 'Name and year are required.' });
    }

    if (teamNames && (!Array.isArray(teamNames) || teamNames.length > 8)) {
      return res.status(400).json({ success: false, message: 'Teams must be an array of maximum 8 items.' });
    }

    const tournament = await Tournament.create({
      name,
      year,
      status: 'upcoming'
    });

    const createdTeams = [];
    if (teamNames && teamNames.length > 0) {
      for (const teamName of teamNames) {
        if (teamName && teamName.trim()) {
          const team = await Team.create({
            name: teamName.trim(),
            tournamentId: tournament._id,
            group: null,
            captainId: null
          });
          createdTeams.push(team);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: tournament,
      teams: createdTeams
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tournament details
// @route   PUT /api/tournaments/:id
// @access  Private/Admin
const updateTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tournament status
// @route   PATCH /api/tournaments/:id/status
// @access  Private/Admin
const updateTournamentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['upcoming', 'ongoing', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    tournament.status = status;
    await tournament.save();

    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset all players' active state (teamId, isCaptain) for a new season
// @route   POST /api/tournaments/reset-players
// @access  Private/Admin
const resetPlayersActiveState = async (req, res, next) => {
  try {
    const result = await Player.updateMany(
      {},
      { $set: { teamId: null, isCaptain: false } }
    );

    res.status(200).json({
      success: true,
      message: 'Successfully reset active state for all players',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTournaments,
  getActiveTournament,
  getTournamentById,
  createTournament,
  updateTournament,
  updateTournamentStatus,
  resetPlayersActiveState,
};
