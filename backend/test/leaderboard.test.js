const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { after, before, beforeEach, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');
const SimulationResult = require('../src/models/simulationResults');

const USER_ID = '507f1f77bcf86cd799439011';

let server;
let baseUrl;
let pipelines;
let rows;

function request(path, { userId = USER_ID } = {}) {
  const headers = { connection: 'close' };
  if (userId) {
    headers.cookie = `session=${jwt.sign({}, process.env.JWT_SECRET, { subject: userId, expiresIn: '1h' })}`;
  }
  return fetch(`${baseUrl}${path}`, { headers });
}

before(async () => {
  // Stand-in for the database: record the pipeline and return fixed rows.
  SimulationResult.aggregate = async (pipeline) => {
    pipelines.push(pipeline);
    return rows;
  };

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  pipelines = [];
  rows = [
    { name: 'Ada', preparednessScore: 90, survivalDays: 21, scenario: 'powerOutage' },
    { name: 'Lin', preparednessScore: 70, survivalDays: null, scenario: 'powerOutage' }
  ];
});

after(async () => {
  await new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

test('the leaderboard requires login', async () => {
  const response = await request('/api/leaderboard', { userId: null });
  assert.equal(response.status, 401);
});

test('only standard-length runs of the scenario are ranked', async () => {
  const response = await request('/api/leaderboard?scenario=tornado');
  assert.equal(response.status, 200);

  // Older results have no days field; null in $in matches them too.
  assert.deepEqual(pipelines[0][0], { $match: { scenario: 'tornado', days: { $in: [3, null] } } });
});


test('custom-duration leaderboards use an exact match', async () => {
  const response = await request('/api/leaderboard?scenario=winterStorm&days=145');

  assert.equal(response.status, 200);

  assert.deepEqual(pipelines[0][0], {
    $match: {
      scenario: 'winterStorm',
      days: 145
    }
  });

  const body = await response.json();
  assert.equal(body.data.days, 145);
});


test('default-duration leaderboards include older simulations', async () => {
  const response = await request('/api/leaderboard?scenario=powerOutage&days=14');

  assert.equal(response.status, 200);

  assert.deepEqual(pipelines[0][0], {
    $match: {
      scenario: 'powerOutage',
      days: { $in: [14, null] }
    }
  });
});


test('available leaderboard options are returned correctly', async () => {
  rows = [
    {
      _id: { scenario: 'powerOutage', days: 14 },
      participants: 4
    },
    {
      _id: { scenario: 'winterStorm', days: 145 },
      participants: 1
    }
  ];

  const response = await request('/api/leaderboard/options');
  assert.equal(response.status, 200);

  const body = await response.json();

  assert.deepEqual(body.data.options, [
    { scenario: 'powerOutage', days: 14, participants: 4 },
    { scenario: 'winterStorm', days: 145, participants: 1 }
  ]);
});



test('rows are ranked and include survival days and the standard length', async () => {
  const body = await (await request('/api/leaderboard')).json();

  assert.equal(body.data.scenario, 'powerOutage');
  assert.equal(body.data.days, 14);
  assert.deepEqual(body.data.leaderboard.map((row) => [row.rank, row.name, row.survivalDays]), [
    [1, 'Ada', 21],
    [2, 'Lin', null]
  ]);
});

test('unknown scenarios are rejected with 400', async () => {
  for (const scenario of ['zombies', 'toString']) {
    const response = await request(`/api/leaderboard?scenario=${scenario}`);
    assert.equal(response.status, 400, scenario);
  }
});
