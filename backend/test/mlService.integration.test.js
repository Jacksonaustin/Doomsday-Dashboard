// Runs the real Node route against the real service
// Start the AI service first, then:
//   AI_INTEGRATION_URL=http://127.0.0.1:8000 npm test
// Skipped when AI_INTEGRATION_URL isn't set, so plain `npm test` still works offline.
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { after, before, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');
const SimulationResult = require('../src/models/simulationResults');
const { calculateGaps } = require('../src/services/gapEngine');
const { SCENARIOS } = require('../src/config/scenarios');

const LIVE_URL = process.env.AI_INTEGRATION_URL;
const skip = !LIVE_URL && 'set AI_INTEGRATION_URL to run against the real AI service';

const USER_ID = '507f1f77bcf86cd799439011';
const RESULT_ID = '5f0000000000000000000001';
const household = { adults: 2, children: 1, infants: 1, pets: 1 };
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

let server;
let baseUrl;
let stored; // the simulation result findOne hands back

function getRecommendations() {
  const cookie = `session=${jwt.sign({}, process.env.JWT_SECRET, { subject: USER_ID, expiresIn: '1h' })}`;
  return fetch(`${baseUrl}/api/simulations/${RESULT_ID}/recommendations`, {
    headers: { cookie, connection: 'close' }
  });
}

before(async () => {
  if (skip) return;
  process.env.AI_SERVICE_URL = LIVE_URL;
  SimulationResult.findOne = () => ({ lean: async () => stored });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

// An empty inventory makes every need a shortage, so every resource the gap
// engine can produce goes through the Python service at least once.
for (const scenarioKey of Object.keys(SCENARIOS)) {
  test(`every ${scenarioKey} shortage gets real advice from the AI service`, { skip }, async () => {
    const gaps = calculateGaps({ inventory: [], household, scenarioKey, now: new Date('2026-11-09') });
    stored = { _id: RESULT_ID, userId: USER_ID, scenario: scenarioKey, ...gaps };
    assert.ok(gaps.shortages.length > 0);

    const response = await getRecommendations();
    const body = await response.json();

    assert.equal(response.status, 200);
    // 'fallback' would mean Node couldn't reach or parse the Python response.
    assert.equal(body.data.source, 'ai');
    assert.ok(['semantic', 'tfidf'].includes(body.data.method));
    assert.equal(body.data.results.length, gaps.shortages.length);

    // Unmatched means Python fell back to its generic advice for that shortage.
    // (Name drift between the two services is checked by tests/test_contract.py.)
    const unmatched = body.data.results.filter((r) => !r.matched).map((r) => r.resource);
    assert.deepEqual(unmatched, []);

    for (const result of body.data.results) {
      assert.ok(result.recommendations.length >= 1 && result.recommendations.length <= 3);
      for (const rec of result.recommendations) {
        assert.equal(typeof rec.id, 'string');
        assert.equal(typeof rec.title, 'string');
        assert.notEqual(rec.id, 'generic-kit');
      }
    }

    const order = body.data.results.map((r) => SEVERITY_ORDER[r.severity]);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), 'most severe first');
  });
}

test('a fully stocked result never calls the AI service', { skip }, async () => {
  stored = { _id: RESULT_ID, userId: USER_ID, scenario: 'tornado', preparednessScore: 100, shortages: [], resourceCoverage: [] };
  const body = await (await getRecommendations()).json();
  assert.equal(body.data.source, 'none');
});
test('a typed food item is recognized by the real classifier', { skip }, async () => {
  const cookie = `session=${jwt.sign({}, process.env.JWT_SECRET, { subject: USER_ID, expiresIn: '1h' })}`;
  const response = await fetch(`${baseUrl}/api/inventory/classify`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({ name: '6 cans chicken noodle soup' })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.source, 'ai');
  assert.equal(body.data.matched, true);
  assert.equal(body.data.suggestion.resourceType, 'meal');
  assert.equal(body.data.quantity, 6);
});
