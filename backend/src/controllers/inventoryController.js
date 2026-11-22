const inventoryServices = require('../services/inventoryServices');
const { classifyFood } = require('../services/foodClassifierService');
const httpError = require('../utils/httpError');

async function list(req, res, next) {
  try {
    const items = await inventoryServices.listInventory(req.auth.userId);
    res.status(200).json({
      success: true,
      data: { items },
      message: 'Inventory loaded'
    });
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const item = await inventoryServices.getInventoryItem(req.auth.userId, req.params.id);
    res.status(200).json({ success: true, data: { item }, message: 'Inventory item loaded' });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const item = await inventoryServices.createInventoryItem(req.auth.userId, req.body);
    res.status(201).json({ success: true, data: { item }, message: 'Inventory item added' });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const item = await inventoryServices.updateInventoryItem(
      req.auth.userId,
      req.params.id,
      req.body
    );
    res.status(200).json({ success: true, data: { item }, message: 'Inventory item updated' });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await inventoryServices.deleteInventoryItem(req.auth.userId, req.params.id);
    res.status(200).json({ success: true, data: {}, message: 'Inventory item deleted' });
  } catch (error) {
    next(error);
  }
}

// Same limit as an inventory item's name.
const MAX_NAME_LENGTH = 100;

async function classify(req, res, next) {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw httpError(400, `name must be 1 to ${MAX_NAME_LENGTH} characters`);
    }
    const result = await classifyFood(name);
    res.status(200).json({
      success: true,
      data: result,
      message: result.matched ? 'Item recognized' : 'Could not recognize this item'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { classify, create, getOne, list, remove, update };
