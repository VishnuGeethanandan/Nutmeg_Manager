const mongoose = require('mongoose');

const playerTournamentStatsSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    matchesPlayed: {
      type: Number,
      default: 0,
    },
    goals: {
      type: Number,
      default: 0,
    },
    assists: {
      type: Number,
      default: 0,
    },
    ownGoals: {
      type: Number,
      default: 0,
    },
    yellowCards: {
      type: Number,
      default: 0,
    },
    redCards: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a player only has one stats record per tournament
playerTournamentStatsSchema.index({ tournamentId: 1, playerId: 1 }, { unique: true });

const PlayerTournamentStats = mongoose.model('PlayerTournamentStats', playerTournamentStatsSchema);

module.exports = PlayerTournamentStats;
