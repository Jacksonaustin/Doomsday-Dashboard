const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');
const InventoryItem = require('../src/models/inventoryItems');
const Household = require('../src/models/household');
const SimulationResult = require('../src/models/simulationResults');

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439022';

let server;
let baseUrl;
let households;
let inventory;
let savedResults;

function cookieFor(userId) {
  return `session=${jwt.sign({}, process.env.JWT_SECRET, { subject: userId, expiresIn: '1h' })}`;
}

function request(path, { method = 'GET', userId = USER_ID, body } = {}) {
  const headers = { connection: 'close' };
  if (userId) headers.cookie = cookieFor(userId);
  if (body) headers['content-type'] = 'application/json';
  return fetch(`${baseUrl}${path}`, { method, headers, body: body && JSON.stringify(body) });
}

before(async () => {
  // Stand-ins for the database, like the auth tests use.
  InventoryItem.find = (query) => ({ lean: async () => inventory.filter((i) => i.userId === query.userId) });
  Household.findOne = (query) => ({ lean: async () => households.get(query.userId) || null });
  SimulationResult.create = async (data) => {
    const id = `5f${String(savedResults.length + 1).padStart(22, '0')}`;
    const saved = { ...data, _id: id, id, createdAt: new Date() };
    savedResults.push(saved);
    return saved;
  };
  SimulationResult.find = (query) => ({
    sort: () => ({ limit: () => ({ lean: async () => savedResults.filter((r) => r.userId === query.userId) }) })
  });
  SimulationResult.findOne = (query) => ({
    lean: async () => savedResults.find((r) => r._id === query._id && r.userId === query.userId) || null
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  households = new Map([[USER_ID, { adults: 2, children: 2, infants: 0 }]]);
  inventory = [{ userId: USER_ID, resourceType: 'water', quantity: 6, unit: 'gallons' }];
  savedResults = [];
});

after(async () => {
  await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

test('simulation routes require login', async () => {
  const response = await request('/api/simulations', { method: 'POST', userId: null, body: { scenario: 'tornado' } });
  assert.equal(response.status, 401);
});

test('scenarios are listed for the dropdown', async () => {
  const body = await (await request('/api/simulations/scenarios')).json();
  assert.equal(body.success, true);
  assert.deepEqual(body.data.scenarios[0], { key: 'tornado', label: 'Tornado', days: 3 });
});

test('running a simulation saves and returns the gaps', async () => {
  const response = await request('/api/simulations', { method: 'POST', body: { scenario: 'tornado' } });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(typeof body.data.preparednessScore, 'number');
  assert.ok(body.data.shortages.some((s) => s.resource === 'food'));
  assert.equal(savedResults.length, 1);
  assert.equal(savedResults[0].userId, USER_ID);
});

test('bad scenarios are rejected with 400, including built-in object keys', async () => {
  for (const scenario of ['zombies', 'toString', '__proto__', 42, undefined]) {
    const response = await request('/api/simulations', { method: 'POST', body: { scenario } });
    assert.equal(response.status, 400, `scenario ${String(scenario)}`);
  }
});

test('a missing or empty household returns 400, not 500', async () => {
  households.delete(USER_ID);
  const missing = await request('/api/simulations', { method: 'POST', body: { scenario: 'flood' } });
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).message, /household profile/);

  households.set(USER_ID, { adults: 0, children: 0, infants: 0 });
  const empty = await request('/api/simulations', { method: 'POST', body: { scenario: 'flood' } });
  assert.equal(empty.status, 400);
});

test('users only see their own results', async () => {
  const run = await (await request('/api/simulations', { method: 'POST', body: { scenario: 'tornado' } })).json();

  const mine = await request(`/api/simulations/${run.data.id}`);
  assert.equal(mine.status, 200);

  const theirs = await request(`/api/simulations/${run.data.id}`, { userId: OTHER_USER_ID });
  assert.equal(theirs.status, 404);

  const invalid = await request('/api/simulations/not-an-id');
  assert.equal(invalid.status, 404);

  const history = await (await request('/api/simulations')).json();
  assert.equal(history.data.results.length, 1);
});
