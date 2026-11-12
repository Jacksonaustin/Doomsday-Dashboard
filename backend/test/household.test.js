const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');
const Household = require('../src/models/household');

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439022';

let server;
let baseUrl;
let households;

function cookieFor(userId) {
  return `session=${jwt.sign({}, process.env.JWT_SECRET, { subject: userId, expiresIn: '1h' })}`;
}

function request(path, { method = 'GET', userId = USER_ID, body } = {}) {
  const headers = { connection: 'close' };
  if (userId) headers.cookie = cookieFor(userId);
  if (body !== undefined) headers['content-type'] = 'application/json';
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

before(async () => {
  // Stand-ins for the database, like the other route tests use.
  Household.findOne = (query) => ({ lean: async () => households.get(query.userId) || null });
  Household.findOneAndUpdate = (query, update) => ({
    lean: async () => {
      const saved = { ...households.get(query.userId), ...update.$set, updatedAt: new Date() };
      households.set(query.userId, saved);
      return saved;
    }
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  households = new Map();
});

after(async () => {
  await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

test('household routes require login', async () => {
  assert.equal((await request('/api/household', { userId: null })).status, 401);
  assert.equal((await request('/api/household', { method: 'PUT', userId: null, body: { adults: 1 } })).status, 401);
});

test('a new user has no household yet', async () => {
  const body = await (await request('/api/household')).json();

  assert.equal(body.success, true);
  assert.equal(body.data.household, null);
});

test('saving a household creates it, and saving again updates it', async () => {
  const created = await request('/api/household', { method: 'PUT', body: { adults: 2, children: 2 } });
  assert.equal(created.status, 200);
  assert.deepEqual(
    { ...(await created.json()).data.household, updatedAt: undefined },
    { adults: 2, children: 2, infants: 0, pets: 0, updatedAt: undefined }
  );

  await request('/api/household', { method: 'PUT', body: { adults: 2, children: 3, pets: 1 } });
  const loaded = (await (await request('/api/household')).json()).data.household;

  assert.equal(loaded.children, 3);
  assert.equal(loaded.pets, 1);
  assert.equal(households.size, 1);
});

test('users only see their own household', async () => {
  await request('/api/household', { method: 'PUT', body: { adults: 4 } });
  const other = (await (await request('/api/household', { userId: OTHER_USER_ID })).json()).data.household;

  assert.equal(other, null);
});

test('invalid households are rejected', async () => {
  for (const body of [
    { adults: 0 },
    { adults: -1 },
    { adults: 1.5 },
    { adults: '2' },
    { adults: 51 },
    { adults: 2, pets: -3 },
    []
  ]) {
    const response = await request('/api/household', { method: 'PUT', body });
    assert.equal(response.status, 400, JSON.stringify(body));
  }

  assert.equal(households.size, 0);
});

test('fields other than the counts are ignored', async () => {
  await request('/api/household', { method: 'PUT', body: { adults: 1, userId: OTHER_USER_ID, role: 'ADMIN' } });
  const saved = households.get(USER_ID);

  assert.equal(saved.adults, 1);
  assert.equal(Object.hasOwn(saved, 'role'), false);
  assert.equal(households.has(OTHER_USER_ID), false);
});
