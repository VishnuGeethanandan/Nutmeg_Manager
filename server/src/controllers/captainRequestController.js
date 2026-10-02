const CaptainRequest = require('../models/CaptainRequest');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');

// @desc    Create a captain request
// @route   POST /api/captain-requests
// @access  Private (Player only)
const createCaptainRequest = async (req, res, next) => {
  try {
    const { tournamentId } = req.body;

    // Validate tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || tournament.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'Upcoming tournament not found or invalid.' });
    }

    // Get the player profile for the authenticated user
    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found.' });
    }

    // Identify the team for this tournament matching the player's department
    const team = await Team.findOne({ tournamentId, name: player.departmentName });
    if (!team) {
      return res.status(404).json({ success: false, message: `Team for department ${player.departmentName} not found in this tournament.` });
    }

    // Check if player already has a pending or approved request for this tournament
    const existingRequest = await CaptainRequest.findOne({
      playerId: player._id,
      tournamentId,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingRequest.status} captain request for this tournament.`,
      });
    }

    // Create the request
    const captainRequest = await CaptainRequest.create({
      playerId: player._id,
      tournamentId,
      teamId: team._id,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      captainRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current player's captain requests
// @route   GET /api/captain-requests/me
// @access  Private (Player only)
const getMyCaptainRequests = async (req, res, next) => {
  try {
    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found.' });
    }

    const requests = await CaptainRequest.find({ playerId: player._id })
      .populate('tournamentId', 'name year')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all captain requests (for admin)
// @route   GET /api/captain-requests
// @access  Private (Admin only)
const getCaptainRequests = async (req, res, next) => {
  try {
    const requests = await CaptainRequest.find()
      .populate('playerId', 'name admissionNumber departmentName')
      .populate('tournamentId', 'name year')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a captain request
// @route   PATCH /api/captain-requests/:id/approve
// @access  Private (Admin only)
const approveCaptainRequest = async (req, res, next) => {
  try {
    const request = await CaptainRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Captain request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    const Player = require('../models/Player');
    const Team = require('../models/Team');
    const TeamMembership = require('../models/TeamMembership');

    const player = await Player.findById(request.playerId);
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found.' });
    }

    // Auto-create or find team for this tournament and department
    let team = await Team.findOne({ tournamentId: request.tournamentId, name: player.departmentName });
    
    if (!team) {
       team = await Team.create({
          name: player.departmentName,
          tournamentId: request.tournamentId,
          captainId: player._id
       });
    } else {
       if (team.captainId) {
          return res.status(400).json({ success: false, message: 'This department already has a captain for this tournament.' });
       }
       team.captainId = player._id;
       await team.save();
    }
    
    player.isCaptain = true;
    await player.save();
    
    // Add captain to TeamMembership if not already
    const existingMembership = await TeamMembership.findOne({ tournamentId: request.tournamentId, playerId: player._id });
    if (!existingMembership) {
        await TeamMembership.create({
            playerId: player._id,
            teamId: team._id,
            tournamentId: request.tournamentId
        });
    }

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = Date.now();
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Captain request approved successfully.',
      captainRequest: request,
      team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a captain request
// @route   PATCH /api/captain-requests/:id/reject
// @access  Private (Admin only)
const rejectCaptainRequest = async (req, res, next) => {
  try {
    const request = await CaptainRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Captain request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = Date.now();
    await request.save();

    res.status(200).json({
      success: true,
      message: 'Captain request rejected.',
      captainRequest: request,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCaptainRequest,
  getMyCaptainRequests,
  getCaptainRequests,
  approveCaptainRequest,
  rejectCaptainRequest,
};
