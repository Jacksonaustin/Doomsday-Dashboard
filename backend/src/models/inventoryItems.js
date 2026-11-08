const mongoose = require("mongoose") 

const CATEGORIES = ['liquid', 'food', 'medical', 'power', 'shelter', 'tools', 'hygiene', 'other']; 

const inventoryItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    quantity: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: CATEGORIES },
    unit: { type: String, required: true, trim: true, maxlength: 30 }
  },
  { timestamps: true }
);

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
InventoryItem.CATEGORIES = CATEGORIES;

module.exports = InventoryItem;