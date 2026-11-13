const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');
const SimulationResult = require('../src/models/simulationResults');

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439022';
const RESULT_ID = '5f0000000000000000000001';

let server;
let baseUrl;
let fakeAi;
let aiResponse; // what the fake AI service sends back
let aiRequests; // what Node sent to it
let results;

function cookieFor(userId) {
  return `session=${jwt.sign({}, process.env.JWT_SECRET, { subject: userId, expiresIn: '1h' })}`;
}

function getRecommendations(userId = USER_ID, resultId = RESULT_ID) {
  return fetch(`${baseUrl}/api/simulations/${resultId}/recommendations`, {
    headers: { cookie: cookieFor(userId), connection: 'close' }
  });
}

before(async () => {
  SimulationResult.findOne = (query) => ({
    lean: async () => results.find((r) => r._id === query._id && r.userId === query.userId) || null
  });

  // A stand-in for the Python service, so these tests don't need it running.
  fakeAi = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      aiRequests.push({ path: req.url, body: JSON.parse(body) });
      res.writeHead(aiResponse.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(aiResponse.body));
    });
  });
  fakeAi.listen(0);
  await new Promise((resolve) => fakeAi.once('listening', resolve));
  process.env.AI_SERVICE_URL = `http://127.0.0.1:${fakeAi.address().port}`;

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  process.env.AI_SERVICE_URL = `http://127.0.0.1:${fakeAi.address().port}`;
  aiRequests = [];
  aiResponse = {
    status: 200,
    body: {
      success: true,
      data: {
        method: 'semantic',
        results: [{ resource: 'drinking_water', severity: 'critical', matched: true, lowConfidence: false,
          recommendations: [{ id: 'water-store-supply', title: 'Store water', confidence: 0.4 }] }]
      }
    }
  };
  results = [{
    _id: RESULT_ID,
    userId: USER_ID,
    scenario: 'tornado',
    preparednessScore: 40,
    shortages: [{ resource: 'drinking_water', severity: 'critical', have: 3, need: 6,
      description: 'Household of 4 has 3 of 6 gallons of drinking water needed for a 3-day tornado.' }],
    resourceCoverage: []
  }];
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => fakeAi.close(resolve));
});

test('recommendations come from the AI service', async () => {
  const response = await getRecommendations();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.source, 'ai');
  assert.equal(body.data.results[0].recommendations[0].id, 'water-store-supply');
  assert.match(body.data.advisory, /suggestions only/);
});

test('only the fields the AI service needs are sent', async () => {
  await getRecommendations();

  assert.equal(aiRequests[0].path, '/recommendations');
  assert.deepEqual(aiRequests[0].body.shortages[0], {
    resource: 'drinking_water',
    severity: 'critical',
    description: 'Household of 4 has 3 of 6 gallons of drinking water needed for a 3-day tornado.'
  });
});

test('generic advice is shown when the AI service errors', async () => {
  aiResponse = { status: 500, body: { detail: 'boom' } };
  const body = await (await getRecommendations()).json();

  assert.equal(body.data.source, 'fallback');
  assert.equal(body.data.results[0].recommendations[0].id, 'generic-kit');
  assert.match(body.message, /unavailable/);
});

test('generic advice is shown when the AI service is down or not configured', async () => {
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:1'; // nothing listens here
  assert.equal((await (await getRecommendations()).json()).data.source, 'fallback');

  delete process.env.AI_SERVICE_URL;
  assert.equal((await (await getRecommendations()).json()).data.source, 'fallback');
});

test('generic advice is shown when the AI service sends an unexpected response', async () => {
  aiResponse = { status: 200, body: { hello: 'world' } };
  assert.equal((await (await getRecommendations()).json()).data.source, 'fallback');
});

test('a result with no shortages skips the AI service', async () => {
  results[0].shortages = [];
  const body = await (await getRecommendations()).json();

  assert.equal(body.data.source, 'none');
  assert.equal(aiRequests.length, 0);
});

test("other users' results return 404", async () => {
  assert.equal((await getRecommendations(OTHER_USER_ID)).status, 404);
  assert.equal((await getRecommendations(USER_ID, 'not-an-id')).status, 404);
});