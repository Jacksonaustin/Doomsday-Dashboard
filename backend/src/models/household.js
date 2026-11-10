const mongoose = require('mongoose');

// Minimal version so simulations can run. Expand it in your household work.
const householdSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    adults: { type: Number, required: true, min: 0, default: 1 },
    children: { type: Number, min: 0, default: 0 },
    infants: { type: Number, min: 0, default: 0 },
    pets: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Household', householdSchema);
