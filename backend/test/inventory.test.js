const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');
const InventoryItem = require('../src/models/inventoryItems');

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439022';

let server;
let baseUrl;
let inventory;
let nextItemId;

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

function itemFor(userId, attributes = {}) {
  const id = `5f${String(nextItemId++).padStart(22, '0')}`;
  return {
    _id: id,
    id,
    userId,
    name: 'Emergency meals',
    quantity: 12,
    resourceType: 'meal',
    unit: 'meals',
    createdAt: new Date(),
    updatedAt: new Date(),
    set(key, value) {
      this[key] = value;
    },
    async save() {
      this.updatedAt = new Date();
      return this;
    },
    ...attributes
  };
}

before(async () => {
  InventoryItem.find = (query) => ({
    sort: () => ({
      lean: async () => inventory
        .filter((item) => item.userId === query.userId)
        .sort((a, b) => b.createdAt - a.createdAt)
    })
  });
  InventoryItem.findOne = (query) => {
    const item = inventory.find((entry) =>
      entry.userId === query.userId && entry._id === String(query._id)
    );
    return {
      lean: async () => item || null,
      then: (resolve, reject) => Promise.resolve(item || null).then(resolve, reject)
    };
  };
  InventoryItem.create = async (attributes) => {
    const item = itemFor(attributes.userId, attributes);
    inventory.push(item);
    return item;
  };
  InventoryItem.deleteOne = async (query) => {
    const index = inventory.findIndex((item) =>
      item.userId === query.userId && item._id === String(query._id)
    );
    if (index === -1) return { deletedCount: 0 };
    inventory.splice(index, 1);
    return { deletedCount: 1 };
  };

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  inventory = [];
  nextItemId = 1;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (
    error ? reject(error) : resolve()
  )));
});

test('all inventory endpoints require authentication', async () => {
  const response = await request('/api/inventory', { userId: null });
  assert.equal(response.status, 401);
});

test('users can list and create only their own inventory items', async () => {
  inventory.push(itemFor(OTHER_USER_ID, { name: 'Another household item' }));

  const listResponse = await request('/api/inventory');
  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.deepEqual(listBody.data.items, []);

  const createResponse = await request('/api/inventory', {
    method: 'POST',
    body: {
      name: 'Drinking water',
      quantity: 5,
      resourceType: 'water',
      unit: 'gallons'
    }
  });
  const createBody = await createResponse.json();

  assert.equal(createResponse.status, 201);
  assert.equal(createBody.data.item.name, 'Drinking water');
  assert.equal(createBody.data.item.category, 'liquid');
  assert.equal(inventory.find((item) => item.name === 'Drinking water').userId, USER_ID);

  const refreshed = await (await request('/api/inventory')).json();
  assert.equal(refreshed.data.items.length, 1);
});

test('inventory input validates category-specific resource units', async () => {
  const response = await request('/api/inventory', {
    method: 'POST',
    body: {
      name: 'Water',
      quantity: 2,
      resourceType: 'water',
      unit: 'pieces'
    }
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Unit must be one of/);
});

test('generic supplies stay in the category selected when adding them', async () => {
  const response = await request('/api/inventory', {
    method: 'POST',
    body: {
      name: 'Bandage tape',
      quantity: 2,
      category: 'medical',
      resourceType: 'other',
      unit: 'pieces'
    }
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.item.category, 'medical');

  const listResponse = await request('/api/inventory');
  const listBody = await listResponse.json();
  assert.equal(listBody.data.items[0].category, 'medical');
});

test('a standard resource cannot be saved under a different category', async () => {
  const response = await request('/api/inventory', {
    method: 'POST',
    body: {
      name: 'Meals',
      quantity: 5,
      category: 'other',
      resourceType: 'meal',
      unit: 'meals'
    }
  });

  assert.equal(response.status, 400);
});

test('users can update and delete their own item, but cannot access another user item', async () => {
  const expiresAt = new Date('2030-01-01T00:00:00.000Z');
  const item = itemFor(USER_ID, { expiresAt });
  const otherItem = itemFor(OTHER_USER_ID, { name: 'Other household meals' });
  inventory.push(item, otherItem);

  const updateResponse = await request(`/api/inventory/${item.id}`, {
    method: 'PUT',
    body: {
      name: 'Updated meals',
      quantity: 20,
      resourceType: 'meal',
      unit: 'meals'
    }
  });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).data.item.name, 'Updated meals');
  assert.equal(item.expiresAt, expiresAt);

  const forbiddenUpdate = await request(`/api/inventory/${otherItem.id}`, {
    method: 'PUT',
    body: {
      name: 'Changed',
      quantity: 1,
      resourceType: 'meal',
      unit: 'meals'
    }
  });
  assert.equal(forbiddenUpdate.status, 404);

  const forbiddenDelete = await request(`/api/inventory/${otherItem.id}`, {
    method: 'DELETE'
  });
  assert.equal(forbiddenDelete.status, 404);
  assert.equal(inventory.includes(otherItem), true);

  const deleteResponse = await request(`/api/inventory/${item.id}`, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 200);
  assert.equal(inventory.includes(item), false);
});

test('invalid and unknown item IDs return not found', async () => {
  const invalid = await request('/api/inventory/not-an-id');
  assert.equal(invalid.status, 404);

  const unknown = await request('/api/inventory/507f1f77bcf86cd799439099');
  assert.equal(unknown.status, 404);
});
