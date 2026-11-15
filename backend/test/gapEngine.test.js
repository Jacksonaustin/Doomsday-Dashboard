const assert = require('node:assert/strict');
const { test } = require('node:test');
const { calculateGaps } = require('../src/services/gapEngine');

const family = { adults: 2, children: 2, infants: 0 };
const now = new Date('2026-11-09');

function find(result, resource) {
  return result.resourceCoverage.find((r) => r.resource === resource);
}

test('an empty inventory scores 0 with every need short', () => {
  const result = calculateGaps({ inventory: [], household: family, scenarioKey: 'tornado', now });

  assert.equal(result.preparednessScore, 0);
  assert.equal(result.shortages.length, 8);
  assert.equal(find(result, 'drinking_water').need, 6); // 0.5 gal x 4 people x 3 days
});

test('a fully stocked household scores 100 with no shortages', () => {
  const inventory = [
    { resourceType: 'water', quantity: 12, unit: 'gallons' },
    { resourceType: 'meal', quantity: 36, unit: 'meals' },
    { resourceType: 'first_aid_kit', quantity: 1, unit: 'pieces' },
    { resourceType: 'flashlight', quantity: 2, unit: 'pieces' },
    { resourceType: 'radio', quantity: 1, unit: 'pieces' },
    { resourceType: 'shelter', quantity: 1, unit: 'pieces' },
    { resourceType: 'sanitation', quantity: 1, unit: 'pieces' }
  ];
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'tornado', now });

  assert.equal(result.preparednessScore, 100);
  assert.deepEqual(result.shortages, []);
});

test('shelf-stable drinks cover drinking but not sanitation', () => {
  const inventory = [{ resourceType: 'drink', shelfStable: true, quantity: 6, unit: 'gallons' }];
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'tornado', now });

  assert.equal(find(result, 'drinking_water').coverage, 1);
  assert.equal(find(result, 'sanitation_water').have, 0);
});

test('fresh milk and expired items are not counted', () => {
  const inventory = [
    { resourceType: 'drink', shelfStable: false, quantity: 6, unit: 'gallons' },
    { resourceType: 'water', quantity: 12, unit: 'gallons', expiresAt: '2026-01-01' }
  ];
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'tornado', now });

  assert.equal(find(result, 'drinking_water').have, 0);
  assert.equal(find(result, 'sanitation_water').have, 0);
});

test('units are converted and shortages get a description for the AI service', () => {
  const inventory = [{ resourceType: 'water', quantity: 128, unit: 'fluid_ounces' }]; // 1 gallon
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'powerOutage', now });
  const drinking = result.shortages.find((s) => s.resource === 'drinking_water');

  assert.equal(drinking.have, 1);
  assert.equal(drinking.need, 28);
  assert.equal(drinking.severity, 'critical');
  assert.equal(
    drinking.description,
    'Household of 4 has 1 of 28 gallons of drinking water needed for a 14-day long-term power outage.'
  );
});

test('unknown scenarios and missing or empty households are rejected', () => {
  assert.throws(() => calculateGaps({ household: family, scenarioKey: 'zombies' }), /Unknown scenario/);
  assert.throws(() => calculateGaps({ household: family, scenarioKey: 'toString' }), /Unknown scenario/);
  assert.throws(() => calculateGaps({ scenarioKey: 'flood' }), /household profile is required/);
  assert.throws(() => calculateGaps({ household: { adults: 0 }, scenarioKey: 'flood' }), /at least one person/);
});

test('an amount that rounds up to the need is not reported as a shortage', () => {
  // 11.96 gallons leaves 5.96 for sanitation, which displays as 6 of 6.
  const inventory = [{ resourceType: 'water', quantity: 11.96, unit: 'gallons' }];
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'tornado', now });

  assert.equal(find(result, 'sanitation_water').have, 6);
  assert.equal(result.shortages.some((s) => s.resource === 'sanitation_water'), false);
});

test('medication is not a need when none is tracked', () => {
  const result = calculateGaps({ inventory: [], household: family, scenarioKey: 'winterStorm', now });

  assert.equal(find(result, 'medication'), undefined);
});

test('medication coverage is the shortest supply', () => {
  const inventory = [
    { resourceType: 'medication', quantity: 14, unit: 'days' },
    { resourceType: 'medication', quantity: 3, unit: 'days' }
  ];
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'winterStorm', now });
  const medication = result.shortages.find((s) => s.resource === 'medication');

  assert.equal(medication.have, 3);
  assert.equal(medication.need, 7);
  assert.equal(medication.daysCovered, 3);
  assert.equal(medication.severity, 'critical');
});

test('expired medication is flagged, not skipped', () => {
  const inventory = [{ resourceType: 'medication', quantity: 30, unit: 'days', expiresAt: '2026-01-01' }];
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'tornado', now });

  assert.equal(find(result, 'medication').have, 0);
  assert.ok(result.shortages.some((s) => s.resource === 'medication'));
});
test('pets add drinking water and a pet food need', () => {
  const household = { ...family, pets: 2 };
  const result = calculateGaps({ inventory: [], household, scenarioKey: 'tornado', now });

  assert.equal(find(result, 'drinking_water').need, 7.5); // (0.5 x 4 + 0.25 x 2) x 3 days
  assert.equal(find(result, 'pet_food').need, 3);
  assert.match(result.shortages[0].description, /^Household of 4 and 2 pets has/);
});

test('no pets means no pet food need', () => {
  const result = calculateGaps({ inventory: [], household: family, scenarioKey: 'tornado', now });

  assert.equal(find(result, 'pet_food'), undefined);
  assert.equal(find(result, 'infant_food'), undefined);
});

test('infants need infant food and water but not meals', () => {
  const household = { adults: 2, children: 0, infants: 1 };
  const result = calculateGaps({ inventory: [], household, scenarioKey: 'tornado', now });

  assert.equal(find(result, 'food').need, 18); // 3 meals x 2 adults x 3 days
  assert.equal(find(result, 'drinking_water').need, 4.5); // 0.5 x 3 people x 3 days
  assert.equal(find(result, 'infant_food').need, 3);
});

test('a household of only infants has no meal need', () => {
  const inventory = [{ resourceType: 'infant_food', quantity: 3, unit: 'days' }];
  const result = calculateGaps({ inventory, household: { adults: 0, infants: 1 }, scenarioKey: 'tornado', now });

  assert.equal(find(result, 'food'), undefined);
  assert.equal(find(result, 'infant_food').coverage, 1);
});

test('a custom length replaces the scenario default', () => {
  const result = calculateGaps({ inventory: [], household: family, scenarioKey: 'tornado', days: 10, now });

  assert.equal(result.days, 10);
  assert.equal(find(result, 'drinking_water').need, 20); // 0.5 gal x 4 people x 10 days
  assert.match(result.shortages[0].description, /needed for a 10-day tornado\.$/);
});

test('survival uses all drinkable water and names what runs out first', () => {
  const inventory = [
    { resourceType: 'water', quantity: 40, unit: 'gallons' }, // 20 days of drinking for 4
    { resourceType: 'meal', quantity: 60, unit: 'meals' } // 5 days for 4
  ];
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'tornado', now });

  assert.deepEqual(result.survival, { days: 5, limitedBy: 'food' });
  assert.equal(result.preparednessScore < 100, true); // the score is still for the 3-day run
  assert.equal(find(result, 'drinking_water').daysCovered, 3); // drinking only gets what 3 days needs
});

test('medication can be what runs out first', () => {
  const inventory = [
    { resourceType: 'water', quantity: 40, unit: 'gallons' },
    { resourceType: 'meal', quantity: 240, unit: 'meals' },
    { resourceType: 'medication', quantity: 4, unit: 'days' }
  ];
  const result = calculateGaps({ inventory, household: family, scenarioKey: 'powerOutage', now });

  assert.deepEqual(result.survival, { days: 4, limitedBy: 'medication' });
});
