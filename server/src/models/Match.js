const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    group: {
      type: String,
      enum: ['A', 'B', 'Semi-Final', 'Final'],
      required: true,
    },
    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    matchDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed'],
      default: 'scheduled',
    },
    team1Goals: {
      type: Number,
      default: 0,
    },
    team2Goals: {
      type: Number,
      default: 0,
    },
    team1Cards: {
      type: Number,
      default: 0,
    },
    team2Cards: {
      type: Number,
      default: 0,
    },
    team1Penalties: {
      type: Number,
      default: null,
    },
    team2Penalties: {
      type: Number,
      default: null,
    },
    playerStats: [{
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      goals: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      yellowCards: { type: Number, default: 0 },
      redCards: { type: Number, default: 0 }
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', matchSchema);
