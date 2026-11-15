const mongoose = require('mongoose');

const simulationResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scenario: { type: String, required: true },
    // How long the simulated disaster lasted. Older results don't have it.
    days: { type: Number, min: 1 },
    preparednessScore: { type: Number, required: true, min: 0, max: 100 },
    // How long supplies last, and which one runs out first.
    survival: {
      days: Number,
      limitedBy: String
    },
    shortages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    resourceCoverage: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // The household at the time, so old results still make sense after it changes.
    household: {
      adults: Number,
      children: Number,
      infants: Number,
      pets: Number
    }
  },
  { timestamps: true }
);

// History is listed newest first per user.
simulationResultSchema.index({ userId: 1, createdAt: -1 });
// The leaderboard filters by scenario and length, newest first.
simulationResultSchema.index({ scenario: 1, days: 1, createdAt: -1 });

module.exports = mongoose.model('SimulationResult', simulationResultSchema);
