const mongoose = require('mongoose');
const InventoryItem = require('../models/inventoryItems');
const Household = require('../models/household');
const SimulationResult = require('../models/simulationResults');
const { SCENARIOS } = require('../config/scenarios');
const { calculateGaps } = require('./gapEngine');
const httpError = require('../utils/httpError');

function listScenarios() {
  return Object.entries(SCENARIOS).map(([key, scenario]) => ({
    key,
    label: scenario.label,
    days: scenario.days
  }));
}

function toPublicResult(result) {
  return {
    id: result.id || result._id.toString(),
    scenario: result.scenario,
    preparednessScore: result.preparednessScore,
    shortages: result.shortages,
    resourceCoverage: result.resourceCoverage,
    household: result.household,
    createdAt: result.createdAt
  };
}

async function runSimulation(userId, scenarioKey) {
  // hasOwn stops keys like "toString" from matching built-in object properties.
  if (typeof scenarioKey !== 'string' || !Object.hasOwn(SCENARIOS, scenarioKey)) {
    throw httpError(400, `Scenario must be one of: ${Object.keys(SCENARIOS).join(', ')}`);
  }

  const [inventory, household] = await Promise.all([
    InventoryItem.find({ userId }).lean(),
    Household.findOne({ userId }).lean()
  ]);

  if (!household) {
    throw httpError(400, 'Set up your household profile before running a simulation');
  }

  let gaps;
  try {
    gaps = calculateGaps({ inventory, household, scenarioKey });
  } catch (error) {
    // The engine only throws for bad input, like a household with no people.
    throw httpError(400, error.message);
  }

  const saved = await SimulationResult.create({
    userId,
    ...gaps,
    household: {
      adults: household.adults || 0,
      children: household.children || 0,
      infants: household.infants || 0
    }
  });

  return toPublicResult(saved);
}

async function listResults(userId) {
  const results = await SimulationResult.find({ userId }).sort({ createdAt: -1 }).limit(20).lean();
  return results.map(toPublicResult);
}

async function getResult(userId, resultId) {
  // Unknown and invalid IDs get the same 404, so other users' results can't be probed.
  if (!mongoose.isValidObjectId(resultId)) {
    throw httpError(404, 'Simulation result not found');
  }

  const result = await SimulationResult.findOne({ _id: resultId, userId }).lean();
  if (!result) {
    throw httpError(404, 'Simulation result not found');
  }

  return toPublicResult(result);
}

module.exports = { getResult, listResults, listScenarios, runSimulation };