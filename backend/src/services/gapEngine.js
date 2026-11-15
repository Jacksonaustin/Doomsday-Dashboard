const { RESOURCE_TYPES } = require('../config/resourceTypes');
const { REQUIREMENTS } = require('../config/requirements');
const { SCENARIOS } = require('../config/scenarios');
const ALL_MEMBERS = ['adults', 'children', 'infants'];

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

// Calculates how many days of medication coverage the household has.
// Only if the household has medication in their inventory.
function medicationDays(inventory, now) {
  const meds = inventory.filter((item) => item.resourceType === 'medication');
  if (meds.length === 0) return null;

  return Math.min(...meds.map((item) =>
    item.expiresAt && new Date(item.expiresAt) < now ? 0 : item.quantity));
}

function severityFor(requirement, coverage) {
  if (coverage < 0.5) return requirement.critical ? 'critical' : 'high';
  return 'medium';
}

function membersFor(requirement, household) {
  return (requirement.members || ALL_MEMBERS)
    .reduce((sum, field) => sum + (household[field] || 0), 0);
}

function dailyNeed(requirement, household) {
  return requirement.perPersonPerDay * membersFor(requirement, household) +
    (requirement.perPetPerDay || 0) * (household.pets || 0);
}

function needFor(requirement, household, scenario) {
  if (requirement.kind === 'consumable') return dailyNeed(requirement, household) * scenario.days;
  if (requirement.kind === 'duration') return scenario.days;
  return requirement.minimum;
}

function daysCoveredFor(requirement, have, household) {
  if (requirement.kind === 'consumable') return round(have / dailyNeed(requirement, household));
  if (requirement.kind === 'duration') return round(have);
  return null;
}

// The scenario's needs, plus the ones that depend on who is in the household.
function needsFor(scenario, household, medDays) {
  const conditional = Object.keys(REQUIREMENTS).filter((key) => {
    const field = REQUIREMENTS[key].when;
    return field && (household[field] || 0) > 0;
  });
  const needs = [...scenario.needs, ...conditional, ...(medDays === null ? [] : ['medication'])];

  // A household of only infants needs no meals; skip it instead of dividing by 0.
  return needs.filter((key) => needFor(REQUIREMENTS[key], household, scenario) > 0);
}

function describe(shortage, people, pets, scenario) {
  const who = pets > 0 ? `${people} and ${pets} ${pets === 1 ? 'pet' : 'pets'}` : `${people}`;
  return `Household of ${who} has ${shortage.have} of ${shortage.need} ${shortage.unit} ` +
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

  const pets = household.pets || 0;
  const totals = totalsByResourceType(inventory, now);
  const drinkingNeed = needFor(REQUIREMENTS.drinking_water, household, scenario);
  const water = splitWater(totals, drinkingNeed);
  const medDays = medicationDays(inventory, now);
  const needs = needsFor(scenario, household, medDays);

  const resourceCoverage = needs.map((key) => {
    const requirement = REQUIREMENTS[key];
    let have;
    if (key === 'medication') {
      have = medDays;

    } else if (key in water) {

      have = water[key];

    } else {

      have = requirement.counts.reduce((sum, type) => sum + (totals[type] || 0), 0);
    }

    const need = needFor(requirement, household, scenario);
    const daysCovered = daysCoveredFor(requirement, have, household);

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
      daysCovered: daysCovered
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
       return { ...shortage, description: describe(shortage, people, pets, scenario)};
    });

  return {
    scenario: scenarioKey,
    preparednessScore: Math.round((weightedCoverage / totalWeight) * 100),
    shortages,
    resourceCoverage
  };
}

module.exports = { calculateGaps };
