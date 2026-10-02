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
const calculateStandings = async (tournamentId) => {
  const allTeams = await Team.find({ tournamentId });
  const matches = await Match.find({ tournamentId, status: 'completed' });

  const stats = {};
  
  allTeams.forEach(team => {
    stats[team._id] = {
      _id: team._id,
      name: team.name,
      group: team.group,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cards: 0
    };
  });

  matches.forEach(match => {
    const t1 = stats[match.team1];
    const t2 = stats[match.team2];

    if (!t1 || !t2) return;

    t1.played += 1;
    t2.played += 1;
    
    t1.goalsFor += match.team1Goals;
    t1.goalsAgainst += match.team2Goals;
    t1.cards += match.team1Cards;
    
    t2.goalsFor += match.team2Goals;
    t2.goalsAgainst += match.team1Goals;
    t2.cards += match.team2Cards;

    if (match.team1Goals > match.team2Goals) {
      t1.won += 1;
      t1.points += 3;
      t2.lost += 1;
    } else if (match.team2Goals > match.team1Goals) {
      t2.won += 1;
      t2.points += 3;
      t1.lost += 1;
    } else {
      t1.drawn += 1;
      t2.drawn += 1;
      t1.points += 1;
      t2.points += 1;
    }
  });

  const sortTeams = (groupTeams) => {
    return groupTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      
      const h2hMatch = matches.find(m => 
        (m.team1.toString() === a._id.toString() && m.team2.toString() === b._id.toString()) ||
        (m.team1.toString() === b._id.toString() && m.team2.toString() === a._id.toString())
      );

      if (h2hMatch) {
        const aIsTeam1 = h2hMatch.team1.toString() === a._id.toString();
        const aGoals = aIsTeam1 ? h2hMatch.team1Goals : h2hMatch.team2Goals;
        const bGoals = aIsTeam1 ? h2hMatch.team2Goals : h2hMatch.team1Goals;
        if (aGoals !== bGoals) return bGoals - aGoals;
      }

      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

      return a.cards - b.cards;
    });
  };

  const groupA = sortTeams(Object.values(stats).filter(t => t.group === 'A'));
  const groupB = sortTeams(Object.values(stats).filter(t => t.group === 'B'));

  return { groupA, groupB };
};

// @desc    Get tournament standings
// @route   GET /api/tournaments/:id/standings
// @access  Public
const getTournamentStandings = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    const standings = await calculateStandings(tournament._id);

    res.status(200).json({
      success: true,
      data: standings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate semi-finals
// @route   POST /api/tournaments/:id/generate-semis
// @access  Private/Admin
const generateSemis = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    // Check if semi-finals already exist
    const existingSemis = await Match.find({ tournamentId: tournament._id, group: 'Semi-Final' });
    if (existingSemis.length > 0) {
      return res.status(400).json({ success: false, message: 'Semi-Finals already generated' });
    }

    // Check if all group matches are completed
    const groupMatches = await Match.find({ 
      tournamentId: tournament._id, 
      group: { $in: ['A', 'B'] } 
    });

    if (groupMatches.length !== 12) {
      return res.status(400).json({ success: false, message: 'Group matches have not been properly generated' });
    }

    const uncompleted = groupMatches.filter(m => m.status !== 'completed');
    if (uncompleted.length > 0) {
      return res.status(400).json({ success: false, message: 'Complete all group matches first' });
    }

    // Get standings
    const { groupA, groupB } = await calculateStandings(tournament._id);

    // A1 vs B2, B1 vs A2
    const a1 = groupA[0];
    const a2 = groupA[1];
    const b1 = groupB[0];
    const b2 = groupB[1];

    if (!a1 || !a2 || !b1 || !b2) {
       return res.status(400).json({ success: false, message: 'Not enough teams to generate semi-finals' });
    }

    const semi1 = new Match({
      tournamentId: tournament._id,
      group: 'Semi-Final',
      team1: a1._id,
      team2: b2._id
    });

    const semi2 = new Match({
      tournamentId: tournament._id,
      group: 'Semi-Final',
      team1: b1._id,
      team2: a2._id
    });

    await Promise.all([semi1.save(), semi2.save()]);

    res.status(200).json({ success: true, message: 'Semi-Finals generated successfully' });
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
  getTournamentStandings,
  generateSemis,
};
