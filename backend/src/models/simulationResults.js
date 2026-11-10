const mongoose = require('mongoose');

const simulationResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scenario: { type: String, required: true },
    preparednessScore: { type: Number, required: true, min: 0, max: 100 },
    shortages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    resourceCoverage: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // The household at the time, so old results still make sense after it changes.
    household: {
      adults: Number,
      children: Number,
      infants: Number
    }
  },
  { timestamps: true }
);

// History is listed newest first per user.
simulationResultSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SimulationResult', simulationResultSchema);
