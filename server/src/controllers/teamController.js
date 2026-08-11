const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const CaptainRequest = require('../models/CaptainRequest');
const TeamMembership = require('../models/TeamMembership');

// @desc    Create a team
// @route   POST /api/teams
// @access  Private (Admin only)
const createTeam = async (req, res, next) => {
  try {
    const { name, tournamentId } = req.body;

    if (!name || !tournamentId) {
      return res.status(400).json({ success: false, message: 'Team name and tournament ID are required.' });
    }

    // Validate tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found.' });
    }

    // Check team count limit
    const currentTeamCount = await Team.countDocuments({ tournamentId });
    if (currentTeamCount >= tournament.maxTeams) {
      return res.status(400).json({
        success: false,
        message: `Tournament team limit (${tournament.maxTeams}) reached. Cannot create more teams.`,
      });
    }

    // Check unique name in tournament
    const existingTeam = await Team.findOne({ name, tournamentId });
    if (existingTeam) {
      return res.status(409).json({ success: false, message: 'A team with this name already exists in the tournament.' });
    }

    const team = await Team.create({
      name,
      tournamentId,
    });

    res.status(201).json({
      success: true,
      team,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A team with this name already exists in the tournament.' });
    }
    next(error);
  }
};

// @desc    Get all teams for a tournament
// @route   GET /api/teams?tournamentId=123
// @access  Private (Admin only)
const getTeams = async (req, res, next) => {
  try {
    const { tournamentId } = req.query;
    
    let query = {};
    if (tournamentId) {
      query.tournamentId = tournamentId;
    }

    const teams = await Team.find(query)
      .populate('tournamentId', 'name year')
      .populate({
        path: 'captainId',
        select: 'name admissionNumber departmentName',
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      teams,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private (Admin only)
const getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('tournamentId', 'name year')
      .populate({
        path: 'captainId',
        select: 'name admissionNumber departmentName position photo',
      });

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    // Fetch roster / memberships
    const memberships = await TeamMembership.find({ teamId: team._id }).populate(
      'playerId',
      'name admissionNumber departmentName position jerseyNumber photo'
    );

    res.status(200).json({
      success: true,
      team,
      roster: memberships.map((m) => ({ ...m.playerId._doc, joinedAt: m.joinedAt })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a team (assign captain)
// @route   PATCH /api/teams/:id
// @access  Private (Admin only)
const updateTeam = async (req, res, next) => {
  try {
    const { captainId } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    if (captainId !== undefined) {
      // Trying to assign or remove a captain
      if (captainId) {
        // Validate that this team doesn't already have a captain
        if (team.captainId && team.captainId.toString() !== captainId) {
           return res.status(400).json({ success: false, message: 'This team already has a captain assigned.' });
        }

        // Validate the player has an approved captain request for this tournament
        const approvedRequest = await CaptainRequest.findOne({
          playerId: captainId,
          tournamentId: team.tournamentId,
          status: 'approved',
        });

        if (!approvedRequest) {
          return res.status(400).json({
            success: false,
            message: 'Player does not have an approved captain request for this tournament.',
          });
        }

        // Check if player is already captaining another team in this tournament
        const existingCaptainTeam = await Team.findOne({
          tournamentId: team.tournamentId,
          captainId: captainId,
          _id: { $ne: team._id },
        });

        if (existingCaptainTeam) {
          return res.status(400).json({
            success: false,
            message: 'This player is already the captain of another team in this tournament.',
          });
        }

        // We also need to add them to the team membership roster if not already there
        const existingMembership = await TeamMembership.findOne({
           playerId: captainId,
           tournamentId: team.tournamentId
        });

        if (existingMembership) {
           if (existingMembership.teamId.toString() !== team._id.toString()) {
               return res.status(400).json({
                   success: false,
                   message: 'This player already belongs to another team in this tournament.'
               });
           }
        } else {
           // Add to TeamMembership
           await TeamMembership.create({
               playerId: captainId,
               teamId: team._id,
               tournamentId: team.tournamentId
           });
        }

        team.captainId = captainId;
      } else {
        // Removing captain
        team.captainId = null;
      }
    }

    // Could also update name etc if needed later
    if (req.body.name) {
       team.name = req.body.name;
    }

    await team.save();

    res.status(200).json({
      success: true,
      message: 'Team updated successfully.',
      team,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Constraint violation: duplicate name or captain.' });
    }
    next(error);
  }
};

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
};
