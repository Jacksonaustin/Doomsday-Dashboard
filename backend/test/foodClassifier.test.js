const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');

const USER_ID = '507f1f77bcf86cd799439011';

let server;
let baseUrl;
let fakeAi;
let aiResponse; // what the fake AI service sends back
let aiRequests; // what Node sent to it

const SOUP = {
  matched: true,
  method: 'semantic',
  quantity: 6,
  confidence: 0.71,
  match: { id: 'canned-soup', name: 'Canned soup' },
  resourceType: 'meal',
  perishable: false,
  needsCooking: false,
  mealsPerUnit: 1,
  estimatedMeals: 6,
  shelfLifeDays: 730
};

function classify(body, { signedIn = true } = {}) {
  const headers = { 'content-type': 'application/json', connection: 'close' };
  if (signedIn) {
    headers.cookie = `session=${jwt.sign({}, process.env.JWT_SECRET, { subject: USER_ID, expiresIn: '1h' })}`;
  }
  return fetch(`${baseUrl}/api/inventory/classify`, { method: 'POST', headers, body: JSON.stringify(body) });
}

before(async () => {
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

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  process.env.AI_SERVICE_URL = `http://127.0.0.1:${fakeAi.address().port}`;
  aiRequests = [];
  aiResponse = { status: 200, body: { success: true, data: SOUP } };
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => fakeAi.close(resolve));
});

test('a recognized food comes back with form-ready fields', async () => {
  const response = await classify({ name: '  6 cans chicken noodle soup ' });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(aiRequests, [{ path: '/food/classify', body: { name: '6 cans chicken noodle soup' } }]);
  assert.equal(body.data.source, 'ai');
  assert.equal(body.data.matched, true);
  assert.deepEqual(body.data.suggestion, {
    resourceType: 'meal',
    category: 'food',
    unit: 'meals',
    quantity: 6,
    expiresInDays: 730
  });
});

test('infant and pet food leave the day count to the user', async () => {
  aiResponse.body.data = { ...SOUP, resourceType: 'pet_food', mealsPerUnit: null, estimatedMeals: null };
  const body = await (await classify({ name: '2 bags dog food' })).json();

  assert.equal(body.data.suggestion.unit, 'days');
  assert.equal(body.data.suggestion.quantity, null);
});

test('an unrecognized item has no suggestion', async () => {
  aiResponse.body.data = { matched: false, method: 'semantic', quantity: null, confidence: 0.2 };
  const body = await (await classify({ name: 'dog leash' })).json();

  assert.equal(body.data.matched, false);
  assert.equal(body.data.suggestion, null);
  assert.equal(body.message, 'Could not recognize this item');
});

test('a resource type this backend does not know is never suggested', async () => {
  aiResponse.body.data = { ...SOUP, resourceType: 'meals' };
  const body = await (await classify({ name: 'soup' })).json();
  assert.equal(body.data.suggestion, null);
});

for (const [label, setup] of [
  ['an error status', () => { aiResponse = { status: 500, body: { detail: 'boom' } }; }],
  ['a bad response shape', () => { aiResponse.body = { success: true }; }],
  ['no AI_SERVICE_URL', () => { delete process.env.AI_SERVICE_URL; }]
]) {
  test(`the form still works when the AI service gives ${label}`, async () => {
    setup();
    const response = await classify({ name: 'soup' });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.source, 'unavailable');
    assert.equal(body.data.matched, false);
  });
}

for (const name of [undefined, '', '   ', 42, 'x'.repeat(101)]) {
  test(`name ${JSON.stringify(name)?.slice(0, 20)} is rejected without calling the AI service`, async () => {
    const response = await classify({ name });
    assert.equal(response.status, 400);
    assert.equal(aiRequests.length, 0);
  });
}

test('signing in is required', async () => {
  const response = await classify({ name: 'soup' }, { signedIn: false });
  assert.equal(response.status, 401);
  assert.equal(aiRequests.length, 0);
});
