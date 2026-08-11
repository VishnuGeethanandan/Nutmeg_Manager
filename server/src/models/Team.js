const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure unique team names per tournament
teamSchema.index({ tournamentId: 1, name: 1 }, { unique: true });

// Ensure a captain can only captain ONE team per tournament
// We use a sparse partial filter so that null captainIds are ignored by the unique index
teamSchema.index(
  { tournamentId: 1, captainId: 1 },
  { unique: true, partialFilterExpression: { captainId: { $ne: null } } }
);

module.exports = mongoose.model('Team', teamSchema);
