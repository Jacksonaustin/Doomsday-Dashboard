const mongoose = require('mongoose');
const ChecklistItem = require('../models/checklistItem');
const SimulationResult = require('../models/simulationResults');
const httpError = require('../utils/httpError');

function validateText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw httpError(400, `${field} is required and must be ${maxLength} characters or fewer`);
  }

  return value.trim();
}

function toPublicItem(item) {
  return {
    id: item.id || item._id.toString(),
    recommendationId: item.recommendationId,
    title: item.title,
    description: item.description,
    category: item.category || '',
    resource: item.resource,
    simulationId: item.simulationId ? item.simulationId.toString() : null,
    completed: item.completed,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

async function listChecklist(userId) {
  const items = await ChecklistItem.find({ userId }).sort({ createdAt: -1 }).lean();
  return items.map(toPublicItem);
}

async function addChecklistItem(userId, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw httpError(400, 'Checklist item details are required');
  }

  const recommendationId = validateText(input.recommendationId, 'Recommendation ID', 200);
  const existing = await ChecklistItem.findOne({ userId, recommendationId }).lean();
  if (existing) {
    return { item: toPublicItem(existing), created: false };
  }

  const item = {
    userId,
    recommendationId,
    title: validateText(input.title, 'Title', 200),
    description: validateText(input.description, 'Description', 3000),
    category: input.category == null || input.category === ''
      ? ''
      : validateText(input.category, 'Category', 100),
    resource: validateText(input.resource, 'Resource', 100),
    completed: false
  };

  if (input.simulationId !== undefined && input.simulationId !== null && input.simulationId !== '') {
    if (!mongoose.isValidObjectId(input.simulationId)) {
      throw httpError(400, 'Simulation ID is invalid');
    }

    const simulation = await SimulationResult.findOne({
      _id: input.simulationId,
      userId
    }).lean();
    if (!simulation) {
      throw httpError(404, 'Simulation not found');
    }

    item.simulationId = input.simulationId;
  }

  try {
    const saved = await ChecklistItem.create(item);
    return { item: toPublicItem(saved), created: true };
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const duplicate = await ChecklistItem.findOne({ userId, recommendationId }).lean();
    if (!duplicate) {
      throw error;
    }

    return { item: toPublicItem(duplicate), created: false };
  }
}

async function setChecklistItemCompleted(userId, itemId, completed) {
  if (!mongoose.isValidObjectId(itemId)) {
    throw httpError(404, 'Checklist item not found');
  }
  if (typeof completed !== 'boolean') {
    throw httpError(400, 'Completed must be a boolean');
  }

  const item = await ChecklistItem.findOne({ _id: itemId, userId });
  if (!item) {
    throw httpError(404, 'Checklist item not found');
  }

  item.completed = completed;
  await item.save();
  return toPublicItem(item);
}

async function removeChecklistItem(userId, itemId) {
  if (!mongoose.isValidObjectId(itemId)) {
    throw httpError(404, 'Checklist item not found');
  }

  const result = await ChecklistItem.deleteOne({ _id: itemId, userId });
  if (result.deletedCount === 0) {
    throw httpError(404, 'Checklist item not found');
  }
}

module.exports = {
  addChecklistItem,
  listChecklist,
  removeChecklistItem,
  setChecklistItemCompleted
};
