const Tournament = require('../models/Tournament');
const Player = require('../models/Player');
const User = require('../models/User');
const Team = require('../models/Team');
const Match = require('../models/Match');

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

// @desc    Get upcoming tournament
// @route   GET /api/tournaments/upcoming
// @access  Private
const getUpcomingTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findOne({
      status: { $regex: /^upcoming$/i },
    }).select('name year _id');

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

// @desc    Allocate teams to Group A and Group B randomly
// @route   POST /api/tournaments/:id/allocate-groups
// @access  Private/Admin
const allocateGroups = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    const teams = await Team.find({ tournamentId: tournament._id });
    if (teams.length !== 8) {
      return res.status(400).json({ success: false, message: 'Need exactly 8 teams to allocate groups' });
    }

    const alreadyAllocated = teams.some(t => t.group !== null && t.group !== undefined);
    if (alreadyAllocated) {
      return res.status(400).json({ success: false, message: 'Groups are already allocated' });
    }

    const shuffled = [...teams].sort(() => 0.5 - Math.random());
    const groupA = shuffled.slice(0, 4);
    const groupB = shuffled.slice(4, 8);

    await Promise.all(groupA.map(t => Team.findByIdAndUpdate(t._id, { group: 'A' })));
    await Promise.all(groupB.map(t => Team.findByIdAndUpdate(t._id, { group: 'B' })));

    res.status(200).json({ success: true, message: 'Groups allocated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate round-robin fixtures
// @route   POST /api/tournaments/:id/generate-fixtures
// @access  Private/Admin
const generateFixtures = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    const existingMatches = await Match.findOne({ tournamentId: tournament._id });
    if (existingMatches) {
      return res.status(400).json({ success: false, message: 'Fixtures already generated for this tournament' });
    }

    const groupATeams = await Team.find({ tournamentId: tournament._id, group: 'A' });
    const groupBTeams = await Team.find({ tournamentId: tournament._id, group: 'B' });

    if (groupATeams.length !== 4 || groupBTeams.length !== 4) {
      return res.status(400).json({ success: false, message: 'Must allocate exactly 4 teams to Group A and 4 to Group B before generating fixtures' });
    }

    const generateRoundRobin = (teams, group) => {
      const matches = [
        { team1: teams[0]._id, team2: teams[1]._id },
        { team1: teams[2]._id, team2: teams[3]._id },
        { team1: teams[0]._id, team2: teams[2]._id },
        { team1: teams[1]._id, team2: teams[3]._id },
        { team1: teams[0]._id, team2: teams[3]._id },
        { team1: teams[1]._id, team2: teams[2]._id },
      ];
      return matches.map(m => ({
        tournamentId: tournament._id,
        group,
        team1: m.team1,
        team2: m.team2,
        status: 'scheduled'
      }));
    };

    const groupAMatches = generateRoundRobin(groupATeams, 'A');
    const groupBMatches = generateRoundRobin(groupBTeams, 'B');

    const allMatches = [...groupAMatches, ...groupBMatches];
    await Match.insertMany(allMatches);

    res.status(201).json({ success: true, message: 'Fixtures generated successfully', count: allMatches.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tournament details (groups and fixtures)
// @route   GET /api/tournaments/:id/details
// @access  Private
const getTournamentDetails = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const allTeams = await Team.find({ tournamentId: tournament._id });
    const groupA = allTeams.filter(t => t.group === 'A');
    const groupB = allTeams.filter(t => t.group === 'B');

    const matches = await Match.find({ tournamentId: tournament._id })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .sort({ group: 1 });

    res.status(200).json({
      success: true,
      data: {
        tournament,
        groupA,
        groupB,
        matches
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTournaments,
  getActiveTournament,
  getUpcomingTournament,
  getTournamentById,
  createTournament,
  updateTournament,
  updateTournamentStatus,
  resetPlayersActiveState,
  allocateGroups,
  generateFixtures,
  getTournamentDetails,
};
