const mongoose = require('mongoose');
const { DEPARTMENTS, POSITIONS } = require('../config/departments');

const playerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true, // One user = one player profile
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    admissionNumber: {
      type: String,
      required: [true, 'Admission number is required'],
      unique: true, // No two players share the same admission number
      trim: true,
      uppercase: true,
    },
    departmentName: {
      type: String,
      required: [true, 'Department is required'],
      enum: {
        values: DEPARTMENTS,
        message: `Department must be one of: ${DEPARTMENTS.join(', ')}`,
      },
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      enum: {
        values: POSITIONS,
        message: `Position must be one of: ${POSITIONS.join(', ')}`,
      },
    },
    jerseyNumber: {
      type: Number,
      required: [true, 'Jersey number is required'],
      min: [1, 'Jersey number must be at least 1'],
      max: [99, 'Jersey number cannot exceed 99'],
    },
    photo: {
      type: String,
      default: null,
    },
    // --- Reserved for Module 3+ (Team & Captain Management) ---
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    isCaptain: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// --- Indexes ---
// userId and admissionNumber unique indexes are declared inline above.
// Mongoose creates them automatically from `unique: true`.

// --- Transform toJSON: strip __v ---
playerSchema.set('toJSON', {
  transform: function (_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
