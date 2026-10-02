const Player = require('../models/Player');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const Tournament = require('../models/Tournament');

// @desc    Get the team (and roster) for the authenticated captain
// @route   GET /api/squad/my-team
// @access  Private (Captain only)
const getCaptainTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found.' });
    }

    const team = await Team.findOne({ _id: teamId, captainId: player._id })
      .populate('tournamentId', 'name year')
      .populate('captainId', 'name admissionNumber departmentName position photo');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found or you are not the captain.' });
    }

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
    const { teamId } = req.params;

    const captain = await Player.findOne({ userId: req.user._id });
    if (!captain) {
      return res.status(404).json({ success: false, message: 'Player profile not found.' });
    }

    const team = await Team.findById(teamId);
    if (!team || team.captainId.toString() !== captain._id.toString()) {
       return res.status(403).json({ success: false, message: 'Not authorized. You are not the captain of this team.' });
    }

    const departmentPlayers = await Player.find({ departmentName: captain.departmentName });
    const departmentPlayerIds = departmentPlayers.map((p) => p._id);

    const existingMemberships = await TeamMembership.find({
      tournamentId: team.tournamentId,
      playerId: { $in: departmentPlayerIds },
    });
    
    const assignedPlayerIds = existingMemberships.map((m) => m.playerId.toString());

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
    const { teamId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ success: false, message: 'Player ID is required.' });
    }

    const captain = await Player.findOne({ userId: req.user._id });
    if (!captain) {
      return res.status(404).json({ success: false, message: 'Your player profile not found.' });
    }

    const team = await Team.findById(teamId);
    if (!team || team.captainId.toString() !== captain._id.toString()) {
       return res.status(403).json({ success: false, message: 'Not authorized. You are not the captain of this team.' });
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

    const existingMembership = await TeamMembership.findOne({ tournamentId: team.tournamentId, playerId });
    if (existingMembership) {
      return res.status(400).json({ success: false, message: 'Player is already assigned to a team in this tournament.' });
    }

    const newMembership = await TeamMembership.create({
      playerId,
      teamId: team._id,
      tournamentId: team.tournamentId
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
    const { teamId, playerId } = req.params;

    const captain = await Player.findOne({ userId: req.user._id });
    if (!captain) {
      return res.status(404).json({ success: false, message: 'Your player profile not found.' });
    }

    const team = await Team.findById(teamId);
    if (!team || team.captainId.toString() !== captain._id.toString()) {
       return res.status(403).json({ success: false, message: 'Not authorized. You are not the captain of this team.' });
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
