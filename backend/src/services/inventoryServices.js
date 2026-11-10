const mongoose = require('mongoose');
const InventoryItem = require('../models/inventoryItems');
const { RESOURCE_TYPES } = require('../config/resourceTypes');
const httpError = require('../utils/httpError');

const MAX_ITEM_NAME_LENGTH = 100;

function validateItem(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw httpError(400, 'Inventory item details are required');
  }

  const { name, quantity, resourceType, unit, shelfStable } = input;

  if (typeof name !== 'string' || !name.trim() || name.trim().length > MAX_ITEM_NAME_LENGTH) {
    throw httpError(400, `Item name is required and must be ${MAX_ITEM_NAME_LENGTH} characters or fewer`);
  }

  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    throw httpError(400, 'Quantity must be a number greater than zero');
  }

  if (typeof resourceType !== 'string' || !Object.hasOwn(RESOURCE_TYPES, resourceType)) {
    throw httpError(400, `Resource type must be one of: ${Object.keys(RESOURCE_TYPES).join(', ')}`);
  }

  const resource = RESOURCE_TYPES[resourceType];
  const category = input.category || resource.category;
  if (
    typeof category !== 'string' ||
    !InventoryItem.CATEGORIES.includes(category) ||
    (resourceType !== 'other' && category !== resource.category)
  ) {
    throw httpError(400, 'Choose a category that matches the selected supply type');
  }

  if (typeof unit !== 'string' || !Object.hasOwn(resource.units, unit)) {
    throw httpError(400, `Unit must be one of: ${Object.keys(resource.units).join(', ')}`);
  }

  if (resourceType === 'drink' && typeof shelfStable !== 'boolean') {
    throw httpError(400, 'Choose whether drinks are shelf-stable');
  }

  const item = {
    name: name.trim(),
    quantity,
    resourceType,
    category,
    unit
  };

  if (resourceType === 'drink') {
    item.shelfStable = shelfStable;
  }

  if (Object.hasOwn(input, 'expiresAt')) {
    if (input.expiresAt === null || input.expiresAt === '') {
      item.expiresAt = null;
    } else {
      const expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        throw httpError(400, 'Expiration date must be a valid date');
      }

      item.expiresAt = expiresAt;
    }
  }

  return item;
}

function toPublicItem(item) {
  const resource = RESOURCE_TYPES[item.resourceType];
  return {
    id: item.id || item._id.toString(),
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    resourceType: item.resourceType,
    category: item.category || resource.category,
    ...(item.resourceType === 'drink' ? { shelfStable: item.shelfStable } : {}),
    ...(item.expiresAt ? { expiresAt: item.expiresAt } : {}),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function listInventory(userId) {
  const items = await InventoryItem.find({ userId }).sort({ createdAt: -1 }).lean();
  return items.map(toPublicItem);
}

async function getInventoryItem(userId, itemId) {
  if (!mongoose.isValidObjectId(itemId)) {
    throw httpError(404, 'Inventory item not found');
  }

  const item = await InventoryItem.findOne({ _id: itemId, userId }).lean();
  if (!item) {
    throw httpError(404, 'Inventory item not found');
  }

  return toPublicItem(item);
}

async function createInventoryItem(userId, input) {
  const item = await InventoryItem.create({
    userId,
    ...validateItem(input)
  });

  return toPublicItem(item);
}

async function updateInventoryItem(userId, itemId, input) {
  if (!mongoose.isValidObjectId(itemId)) {
    throw httpError(404, 'Inventory item not found');
  }

  const item = await InventoryItem.findOne({ _id: itemId, userId });
  if (!item) {
    throw httpError(404, 'Inventory item not found');
  }

  const updatedFields = validateItem(input);
  Object.assign(item, updatedFields);
  if (!Object.hasOwn(updatedFields, 'shelfStable')) {
    item.set('shelfStable', undefined);
  }
  await item.save();
  return toPublicItem(item);
}

async function deleteInventoryItem(userId, itemId) {
  if (!mongoose.isValidObjectId(itemId)) {
    throw httpError(404, 'Inventory item not found');
  }

  const result = await InventoryItem.deleteOne({ _id: itemId, userId });
  if (result.deletedCount === 0) {
    throw httpError(404, 'Inventory item not found');
  }
}

module.exports = {
  createInventoryItem,
  deleteInventoryItem,
  getInventoryItem,
  listInventory,
  updateInventoryItem
};
