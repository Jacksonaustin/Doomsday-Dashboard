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
  assert.equal(result.shortages.length, 6);
  assert.equal(find(result, 'drinking_water').need, 6); // 0.5 gal x 4 people x 3 days
});

test('a fully stocked household scores 100 with no shortages', () => {
  const inventory = [
    { resourceType: 'water', quantity: 12, unit: 'gallons' },
    { resourceType: 'meal', quantity: 36, unit: 'meals' },
    { resourceType: 'first_aid_kit', quantity: 1, unit: 'kits' },
    { resourceType: 'flashlight', quantity: 2, unit: 'items' },
    { resourceType: 'radio', quantity: 1, unit: 'items' }
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
  const inventory = [{ resourceType: 'water', quantity: 128, unit: 'fl_oz' }]; // 1 gallon
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

test('unknown scenarios and empty households are rejected', () => {
  assert.throws(() => calculateGaps({ household: family, scenarioKey: 'zombies' }), /Unknown scenario/);
  assert.throws(() => calculateGaps({ household: { adults: 0 }, scenarioKey: 'flood' }), /at least one person/);
});