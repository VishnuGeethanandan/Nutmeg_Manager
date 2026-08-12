const Player = require('../models/Player');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const Tournament = require('../models/Tournament');

// @desc    Get the team (and roster) for the authenticated captain
// @route   GET /api/squad/my-team
// @access  Private (Captain only)
const getCaptainTeam = async (req, res, next) => {
  try {
    const { tournamentId } = req.query;

    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'Tournament ID is required.' });
    }

    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found.' });
    }

    // Find the team where this player is the captain for the given tournament
    const team = await Team.findOne({ tournamentId, captainId: player._id })
      .populate('tournamentId', 'name year')
      .populate('captainId', 'name admissionNumber departmentName position photo');

    if (!team) {
      return res.status(404).json({ success: false, message: 'You are not the captain of any team in this tournament.' });
    }

    // Fetch roster
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

// @desc    Get eligible unassigned players from the captain's department
// @route   GET /api/squad/eligible-players
// @access  Private (Captain only)
const getEligiblePlayers = async (req, res, next) => {
  try {
    const { tournamentId } = req.query;

    if (!tournamentId) {
      return res.status(400).json({ success: false, message: 'Tournament ID is required.' });
    }

    const captain = await Player.findOne({ userId: req.user._id });
    if (!captain) {
      return res.status(404).json({ success: false, message: 'Player profile not found.' });
    }

    // Ensure they are actually a captain in this tournament
    const team = await Team.findOne({ tournamentId, captainId: captain._id });
    if (!team) {
       return res.status(403).json({ success: false, message: 'Not authorized. You are not a captain in this tournament.' });
    }

    // Find all players in the same department
    const departmentPlayers = await Player.find({ departmentName: captain.departmentName });
    const departmentPlayerIds = departmentPlayers.map((p) => p._id);

    // Find which of these players already have a team in this tournament
    const existingMemberships = await TeamMembership.find({
      tournamentId,
      playerId: { $in: departmentPlayerIds },
    });
    
    const assignedPlayerIds = existingMemberships.map((m) => m.playerId.toString());

    // Filter out assigned players
    const eligiblePlayers = departmentPlayers.filter(
      (p) => !assignedPlayerIds.includes(p._id.toString())
    );

    res.status(200).json({
      success: true,
      players: eligiblePlayers.map(p => ({
        _id: p._id,
        name: p.name,
        admissionNumber: p.admissionNumber,
        departmentName: p.departmentName,
        position: p.position,
        jerseyNumber: p.jerseyNumber,
        photo: p.photo
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a player to the squad (Direct selection)
// @route   POST /api/squad/roster
// @access  Private (Captain only)
const addPlayerToSquad = async (req, res, next) => {
  try {
    const { tournamentId, playerId } = req.body;

    if (!tournamentId || !playerId) {
      return res.status(400).json({ success: false, message: 'Tournament ID and Player ID are required.' });
    }

    const captain = await Player.findOne({ userId: req.user._id });
    if (!captain) {
      return res.status(404).json({ success: false, message: 'Your player profile not found.' });
    }

    const team = await Team.findOne({ tournamentId, captainId: captain._id });
    if (!team) {
       return res.status(403).json({ success: false, message: 'Not authorized. You are not a captain in this tournament.' });
    }

    // Check squad size (Max 15)
    const currentSquadSize = await TeamMembership.countDocuments({ teamId: team._id });
    if (currentSquadSize >= 15) {
      return res.status(400).json({ success: false, message: 'Squad is full (Maximum 15 players).' });
    }

    const targetPlayer = await Player.findById(playerId);
    if (!targetPlayer) {
      return res.status(404).json({ success: false, message: 'Target player not found.' });
    }

    if (targetPlayer.departmentName !== captain.departmentName) {
      return res.status(400).json({ success: false, message: 'Can only select players from your own department.' });
    }

    // Check if player is already in ANY team for this tournament
    const existingMembership = await TeamMembership.findOne({ tournamentId, playerId });
    if (existingMembership) {
      return res.status(400).json({ success: false, message: 'Player is already assigned to a team in this tournament.' });
    }

    // Add to squad
    const newMembership = await TeamMembership.create({
      playerId,
      teamId: team._id,
      tournamentId
    });

    res.status(201).json({
      success: true,
      message: 'Player added to squad.',
      membership: newMembership
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Remove a player from the squad
// @route   DELETE /api/squad/roster/:playerId?tournamentId=123
// @access  Private (Captain only)
const removePlayerFromSquad = async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const { tournamentId } = req.query;

    if (!tournamentId) {
       return res.status(400).json({ success: false, message: 'Tournament ID is required.' });
    }

    const captain = await Player.findOne({ userId: req.user._id });
    if (!captain) {
      return res.status(404).json({ success: false, message: 'Your player profile not found.' });
    }

    const team = await Team.findOne({ tournamentId, captainId: captain._id });
    if (!team) {
       return res.status(403).json({ success: false, message: 'Not authorized. You are not a captain in this tournament.' });
    }

    if (playerId === captain._id.toString()) {
       return res.status(400).json({ success: false, message: 'Captain cannot remove themselves from the squad.' });
    }

    const membership = await TeamMembership.findOne({ teamId: team._id, playerId });
    if (!membership) {
       return res.status(404).json({ success: false, message: 'Player is not in your squad.' });
    }

    await TeamMembership.findByIdAndDelete(membership._id);

    res.status(200).json({
      success: true,
      message: 'Player removed from squad.',
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCaptainTeam,
  getEligiblePlayers,
  addPlayerToSquad,
  removePlayerFromSquad
};
