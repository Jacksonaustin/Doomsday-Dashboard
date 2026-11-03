const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

test('health endpoint reports when MongoDB is disconnected', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { connection: 'close' }
  });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.deepEqual(body, {
    success: false,
    data: {
      status: 'unavailable',
      database: 'disconnected'
    },
    message: 'Database connection is unavailable'
  });
});

test('unknown endpoints return the standard not-found response', async () => {
  const response = await fetch(`${baseUrl}/api/unknown`, {
    headers: { connection: 'close' }
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, {
    success: false,
    message: 'Route not found: GET /api/unknown'
  });
});
