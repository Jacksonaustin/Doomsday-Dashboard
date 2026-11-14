const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');
const ChecklistItem = require('../src/models/checklistItem');
const SimulationResult = require('../src/models/simulationResults');

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439022';
const SIMULATION_ID = '5f0000000000000000000001';

let server;
let baseUrl;
let items;

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

function savedItem(attributes) {
  const id = `5f${String(items.length + 1).padStart(22, '0')}`;
  return {
    _id: id,
    id,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...attributes,
    async save() {
      this.updatedAt = new Date();
      return this;
    }
  };
}

before(async () => {
  ChecklistItem.find = (query) => ({
    sort: () => ({
      lean: async () => items
        .filter((item) => item.userId === query.userId)
        .sort((a, b) => b.createdAt - a.createdAt)
    })
  });
  ChecklistItem.findOne = (query) => {
    const item = items.find((entry) =>
      entry.userId === query.userId &&
      (query._id === undefined || entry._id === String(query._id)) &&
      (query.recommendationId === undefined || entry.recommendationId === query.recommendationId)
    );
    return {
      lean: async () => item || null,
      then: (resolve, reject) => Promise.resolve(item || null).then(resolve, reject)
    };
  };
  ChecklistItem.create = async (attributes) => {
    const existing = items.find((item) =>
      item.userId === attributes.userId &&
      item.recommendationId === attributes.recommendationId
    );
    if (existing) {
      const error = new Error('Duplicate checklist item');
      error.code = 11000;
      throw error;
    }

    const item = savedItem(attributes);
    items.push(item);
    return item;
  };
  ChecklistItem.deleteOne = async (query) => {
    const index = items.findIndex((item) =>
      item.userId === query.userId && item._id === String(query._id)
    );
    if (index === -1) return { deletedCount: 0 };
    items.splice(index, 1);
    return { deletedCount: 1 };
  };
  SimulationResult.findOne = (query) => ({
    lean: async () => (
      query._id === SIMULATION_ID && query.userId === USER_ID
        ? { _id: SIMULATION_ID, userId: USER_ID }
        : null
    )
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  items = [];
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (
    error ? reject(error) : resolve()
  )));
});

const checklistPayload = {
  recommendationId: 'store-water',
  title: 'Store drinking water',
  description: 'Store enough water for your household.',
  category: '',
  resource: 'drinking_water',
  simulationId: SIMULATION_ID
};

test('checklist routes require authentication', async () => {
  const response = await request('/api/checklist', { userId: null });
  assert.equal(response.status, 401);
});

test('checklist items are saved and returned for the owner after reload', async () => {
  const added = await request('/api/checklist', { method: 'POST', body: checklistPayload });
  const addedBody = await added.json();

  assert.equal(added.status, 201);
  assert.equal(addedBody.data.item.completed, false);
  assert.equal(items[0].userId, USER_ID);

  const refreshed = await request('/api/checklist');
  const refreshedBody = await refreshed.json();
  assert.equal(refreshed.status, 200);
  assert.equal(refreshedBody.data.items.length, 1);
  assert.equal(refreshedBody.data.items[0].title, checklistPayload.title);

  const otherUser = await request('/api/checklist', { userId: OTHER_USER_ID });
  assert.deepEqual((await otherUser.json()).data.items, []);
});

test('adding the same recommendation twice does not create duplicates', async () => {
  const first = await request('/api/checklist', { method: 'POST', body: checklistPayload });
  const second = await request('/api/checklist', { method: 'POST', body: checklistPayload });

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(items.length, 1);
});

test('users can persist completion and remove only their own checklist items', async () => {
  const addResponse = await request('/api/checklist', { method: 'POST', body: checklistPayload });
  const item = (await addResponse.json()).data.item;

  const completeResponse = await request(`/api/checklist/${item.id}`, {
    method: 'PATCH',
    body: { completed: true }
  });
  assert.equal(completeResponse.status, 200);
  assert.equal((await completeResponse.json()).data.item.completed, true);

  const foreignUpdate = await request(`/api/checklist/${item.id}`, {
    method: 'PATCH',
    userId: OTHER_USER_ID,
    body: { completed: false }
  });
  assert.equal(foreignUpdate.status, 404);

  const foreignDelete = await request(`/api/checklist/${item.id}`, {
    method: 'DELETE',
    userId: OTHER_USER_ID
  });
  assert.equal(foreignDelete.status, 404);
  assert.equal(items.length, 1);

  const removeResponse = await request(`/api/checklist/${item.id}`, { method: 'DELETE' });
  assert.equal(removeResponse.status, 200);
  assert.equal(items.length, 0);
});

test('invalid input and simulations owned by another user are rejected', async () => {
  const invalid = await request('/api/checklist', {
    method: 'POST',
    body: { ...checklistPayload, title: '' }
  });
  assert.equal(invalid.status, 400);

  const foreignSimulation = await request('/api/checklist', {
    method: 'POST',
    body: { ...checklistPayload, recommendationId: 'foreign-sim', simulationId: '5f0000000000000000000002' }
  });
  assert.equal(foreignSimulation.status, 404);
});
