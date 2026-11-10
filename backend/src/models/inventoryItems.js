const mongoose = require('mongoose');
const { RESOURCE_TYPES } = require('../config/resourceTypes');

// Display groups, worked out from the resource types so the two lists can't drift apart.
const CATEGORIES = [...new Set(Object.values(RESOURCE_TYPES).map((type) => type.category))];

const inventoryItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // What the gap engine counts. The user picks it from a dropdown.
    resourceType: { type: String, required: true, enum: Object.keys(RESOURCE_TYPES) },
    // Generic "other" supplies keep the display category selected by the user.
    category: { type: String, enum: CATEGORIES, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      required: true,
      validate: {
        validator(unit) {
          return Object.hasOwn(RESOURCE_TYPES[this.resourceType]?.units || {}, unit);
        },
        message: 'That unit is not allowed for this resource type'
      }
    },
    // Drinks only: shelf-stable (UHT milk, juice boxes) counts toward drinking water.
    shelfStable: {
      type: Boolean,
      required() {
        return this.resourceType === 'drink';
      }
    },
    expiresAt: { type: Date }
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// The gap engine and inventory list both look items up by user.
inventoryItemSchema.index({ userId: 1, resourceType: 1 });

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
InventoryItem.CATEGORIES = CATEGORIES;

// Note: these validators read this.resourceType, which only works on save().
// For updates, load the item, change it, then call save() instead of findOneAndUpdate.
module.exports = InventoryItem;
