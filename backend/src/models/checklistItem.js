const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recommendationId: { type: String, required: true, trim: true, maxlength: 200 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    category: { type: String, trim: true, maxlength: 100, default: '' },
    resource: { type: String, required: true, trim: true, maxlength: 100 },
    simulationId: { type: mongoose.Schema.Types.ObjectId, ref: 'SimulationResult' },
    completed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

checklistItemSchema.index({ userId: 1, recommendationId: 1 }, { unique: true });

module.exports = mongoose.model('ChecklistItem', checklistItemSchema);
