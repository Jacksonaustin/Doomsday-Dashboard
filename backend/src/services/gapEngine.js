const { RESOURCE_TYPES } = require('../config/resourceTypes');
const { REQUIREMENTS } = require('../config/requirements');
const { SCENARIOS } = require('../config/scenarios');

function round(value) {
  return Math.round(value * 10) / 10;
}

// Adds up usable inventory per resource type, converted to base units.
function totalsByResourceType(inventory, now) {
  const totals = {};

  for (const item of inventory) {
    const factor = RESOURCE_TYPES[item.resourceType]?.units[item.unit];

    if (!factor) continue; // unknown type or unit
    if (item.expiresAt && new Date(item.expiresAt) < now) continue; // expired
    if (item.resourceType === 'drink' && !item.shelfStable) continue; // spoils without power

    totals[item.resourceType] = (totals[item.resourceType] || 0) + item.quantity * factor;
  }

  return totals;
}

// Drinks only count toward drinking. Water fills the rest of drinking first,
// and whatever water is left goes to sanitation.
function splitWater(totals, drinkingNeed) {
  const water = totals.water || 0;
  const drinks = totals.drink || 0;
  const waterForDrinking = Math.min(water, Math.max(0, drinkingNeed - drinks));

  return {
    drinking_water: drinks + waterForDrinking,
    sanitation_water: water - waterForDrinking
  };
}

function severityFor(requirement, coverage) {
  if (coverage < 0.5) return requirement.critical ? 'critical' : 'high';
  return 'medium';
}

function describe(shortage, people, scenario) {
  return `Household of ${people} has ${shortage.have} of ${shortage.need} ${shortage.unit} ` +
    `of ${shortage.label} needed for a ${scenario.days}-day ${scenario.label.toLowerCase()}.`;
}

function calculateGaps({ inventory = [], household, scenarioKey, now = new Date() }) {
  // hasOwn stops keys like "toString" from matching built-in object properties.
  const scenario = Object.hasOwn(SCENARIOS, scenarioKey) ? SCENARIOS[scenarioKey] : null;
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioKey}`);
  }

  if (!household) {
    throw new Error('A household profile is required');
  }

  const people = (household.adults || 0) + (household.children || 0) + (household.infants || 0);
  if (people < 1) {
    throw new Error('Household must include at least one person');
  }

  const totals = totalsByResourceType(inventory, now);
  const drinkingNeed = REQUIREMENTS.drinking_water.perPersonPerDay * people * scenario.days;
  const water = splitWater(totals, drinkingNeed);

  const resourceCoverage = scenario.needs.map((key) => {
    const requirement = REQUIREMENTS[key];
    const have = key in water
      ? water[key]
      : requirement.counts.reduce((sum, type) => sum + (totals[type] || 0), 0);
    const need = requirement.kind === 'consumable'
      ? requirement.perPersonPerDay * people * scenario.days
      : requirement.minimum;

    // Coverage uses the rounded numbers, so "6 of 6" is never reported as a shortage.
    const roundedHave = round(have);
    const roundedNeed = round(need);

    return {
      resource: key,
      label: requirement.label,
      have: roundedHave,
      need: roundedNeed,
      unit: requirement.unit,
      coverage: Math.min(roundedHave / roundedNeed, 1),
      daysCovered: requirement.kind === 'consumable'
        ? round(have / (requirement.perPersonPerDay * people))
        : null
    };
  });

  const totalWeight = resourceCoverage.reduce((sum, r) => sum + REQUIREMENTS[r.resource].weight, 0);
  const weightedCoverage = resourceCoverage.reduce(
    (sum, r) => sum + r.coverage * REQUIREMENTS[r.resource].weight, 0
  );

  const shortages = resourceCoverage
    .filter((r) => r.coverage < 1)
    .map((r) => {
      const shortage = {
        ...r,
        shortfall: round(r.need - r.have),
        severity: severityFor(REQUIREMENTS[r.resource], r.coverage)
      };
      return { ...shortage, description: describe(shortage, people, scenario) };
    });

  return {
    scenario: scenarioKey,
    preparednessScore: Math.round((weightedCoverage / totalWeight) * 100),
    shortages,
    resourceCoverage
  };
}

module.exports = { calculateGaps };
