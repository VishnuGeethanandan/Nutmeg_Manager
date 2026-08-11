const mongoose = require('mongoose');

const teamMembershipSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One player -> Maximum one team -> Per tournament
teamMembershipSchema.index({ playerId: 1, tournamentId: 1 }, { unique: true });

module.exports = mongoose.model('TeamMembership', teamMembershipSchema);
