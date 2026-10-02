const { validationResult, body } = require('express-validator');
const Player = require('../models/Player');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamMembership = require('../models/TeamMembership');
const Tournament = require('../models/Tournament');
const { DEPARTMENTS, POSITIONS } = require('../config/departments');
const fs = require('fs');
const path = require('path');

// --- Validation rules ---
const createProfileValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('admissionNumber')
    .trim()
    .notEmpty()
    .withMessage('Admission number is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Admission number must be between 2 and 30 characters'),
  body('departmentName')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),
  body('phoneNumber')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be a valid 10-digit number'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Position is required')
    .isIn(POSITIONS)
    .withMessage(`Position must be one of: ${POSITIONS.join(', ')}`),
  body('jerseyNumber')
    .notEmpty()
    .withMessage('Jersey number is required')
    .isInt({ min: 1, max: 99 })
    .withMessage('Jersey number must be between 1 and 99'),
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phoneNumber')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be a valid 10-digit number'),
  body('position')
    .optional()
    .trim()
    .isIn(POSITIONS)
    .withMessage(`Position must be one of: ${POSITIONS.join(', ')}`),
  body('jerseyNumber')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Jersey number must be between 1 and 99'),
];

// --- Helper: delete a photo file from disk ---
const deletePhotoFile = (photoPath) => {
  if (!photoPath) return;
  // photoPath is stored as relative URL like /uploads/photos/filename.jpg
  const absolutePath = path.join(__dirname, '..', '..', photoPath);
  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Failed to delete old photo:', err.message);
    }
  });
};

// --- Controllers ---

/**
 * @desc    Create player profile for the authenticated player
 * @route   POST /api/players/profile
 * @access  Private (player only)
 */
const createProfile = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If a photo was uploaded but validation fails, clean it up
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const userId = req.user._id;

    // Check if player profile already exists for this user
    const existingProfile = await Player.findOne({ userId });
    if (existingProfile) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({
        success: false,
        message: 'Player profile already exists. Use PUT to update.',
      });
    }

    // Check admission number uniqueness explicitly (belt-and-suspenders with unique index)
    const admissionNumber = req.body.admissionNumber.trim().toUpperCase();
    const existingAdmission = await Player.findOne({ admissionNumber });
    if (existingAdmission) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({
        success: false,
        message: 'A player with this admission number already exists.',
      });
    }

    // Build player data
    const playerData = {
      userId,
      name: req.body.name.trim(),
      admissionNumber,
      departmentName: req.body.departmentName.trim(),
      phoneNumber: req.body.phoneNumber?.trim() || undefined,
      position: req.body.position.trim(),
      jerseyNumber: parseInt(req.body.jerseyNumber, 10),
    };

    // Handle photo upload
    if (req.file) {
      playerData.photo = `/uploads/photos/${req.file.filename}`;
    }

    const player = await Player.create(playerData);

    // Sync name to users collection (single source of truth)
    await User.findByIdAndUpdate(userId, { name: playerData.name });

    res.status(201).json({
      success: true,
      message: 'Player profile created successfully.',
      player,
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
};

/**
 * @desc    Get the authenticated player's profile
 * @route   GET /api/players/me
 * @access  Private (player only)
 */
const getMyProfile = async (req, res, next) => {
  try {
    const player = await Player.findOne({ userId: req.user._id });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player profile not found. Please complete your profile.',
      });
    }

    let activeTeam = null;
    const activeTournament = await Tournament.findOne({ status: { $in: ['upcoming', 'ongoing'] } }).sort({ year: -1 });
    
    if (activeTournament) {
      const membership = await TeamMembership.findOne({
        playerId: player._id,
        tournamentId: activeTournament._id,
      }).populate('teamId');
      
      if (membership && membership.teamId) {
        activeTeam = membership.teamId;
      }
    }

    res.status(200).json({
      success: true,
      player,
      activeTeam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update the authenticated player's profile
 * @route   PUT /api/players/me
 * @access  Private (player only)
 */
const updateMyProfile = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Player profile not found.',
      });
    }

    // --- Build update object with ONLY allowed fields ---
    const allowedFields = ['name', 'phoneNumber', 'position', 'jerseyNumber'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        if (field === 'name') {
          updates.name = req.body.name.trim();
        } else if (field === 'jerseyNumber') {
          updates.jerseyNumber = parseInt(req.body.jerseyNumber, 10);
        } else if (field === 'phoneNumber') {
          updates.phoneNumber = req.body.phoneNumber.trim();
        } else {
          updates[field] = req.body[field].trim();
        }
      }
    }

    // Handle clearing phone number
    if (req.body.phoneNumber === '') {
      updates.phoneNumber = '';
    }

    // Handle photo upload/replacement
    if (req.file) {
      // Delete old photo from disk
      if (player.photo) {
        deletePhotoFile(player.photo);
      }
      updates.photo = `/uploads/photos/${req.file.filename}`;
    }

    // Handle explicit photo removal (frontend sends removePhoto=true)
    if (req.body.removePhoto === 'true' && !req.file) {
      if (player.photo) {
        deletePhotoFile(player.photo);
      }
      updates.photo = null;
    }

    // Apply updates
    const updatedPlayer = await Player.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    // Sync name to users collection if name was updated
    if (updates.name) {
      await User.findByIdAndUpdate(req.user._id, { name: updates.name });
    }

    res.status(200).json({
      success: true,
      message: 'Player profile updated successfully.',
      player: updatedPlayer,
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
};

/**
 * @desc    Player joins a team (select from dropdown)
 * @route   POST /api/players/join-team
 * @access  Private (player only)
 */
const joinTeam = async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ success: false, message: 'Team ID is required.' });
    }

    const player = await Player.findOne({ userId: req.user._id });
    if (!player) {
      return res.status(404).json({ success: false, message: 'Player profile not found.' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    // Verify it's for an active tournament
    const tournament = await Tournament.findById(team.tournamentId);
    if (!tournament || tournament.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Tournament is completed or invalid.' });
    }

    // Check if player already in a team for this tournament
    const existingMembership = await TeamMembership.findOne({
      playerId: player._id,
      tournamentId: team.tournamentId,
    });

    if (existingMembership) {
      return res.status(400).json({ success: false, message: 'You are already on a team for this tournament.' });
    }

    // Assign player to team
    await TeamMembership.create({
      playerId: player._id,
      teamId: team._id,
      tournamentId: team.tournamentId,
    });

    // Update active denormalized state
    player.teamId = team._id;
    await player.save();

    res.status(200).json({
      success: true,
      message: 'Successfully joined team.',
      player,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  joinTeam,
  createProfileValidation,
  updateProfileValidation,
};
