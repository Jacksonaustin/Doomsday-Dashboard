const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { after, before, test } = require('node:test');

process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';

const app = require('../src/app');
const User = require('../src/models/user');

let server;
let baseUrl;
const users = new Map();
let nextUserId = 1;

before(async () => {
  User.findOne = (query) => {
    const user = [...users.values()].find((candidate) => candidate.email === query.email);
    return {
      select: async () => user,
      then: (resolve, reject) => Promise.resolve(user).then(resolve, reject)
    };
  };
  User.create = async (attributes) => {
    const id = String(nextUserId++);
    const user = { _id: id, id, role: 'USER', ...attributes };
    users.set(id, user);
    return user;
  };
  User.findById = async (id) => users.get(id) || null;

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

test('registration stores a password hash and starts an HTTP-only session', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'Test@example.com',
      password: 'a-strong-password'
    })
  });
  const body = await response.json();
  const storedUser = [...users.values()][0];
  const cookie = response.headers.get('set-cookie');

  assert.equal(response.status, 201);
  assert.deepEqual(body.user, {
    id: storedUser.id,
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER'
  });
  assert.equal(await bcrypt.compare('a-strong-password', storedUser.passwordHash), true);
  assert.equal(Object.hasOwn(body.user, 'passwordHash'), false);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
});

test('login verifies credentials and protected session endpoints reject logged-out users', async () => {
  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password' })
  });
  assert.equal(badLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({ email: 'TEST@example.com', password: 'a-strong-password' })
  });
  const sessionCookie = login.headers.get('set-cookie').split(';')[0];

  assert.equal(login.status, 200);

  const currentUser = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: sessionCookie, connection: 'close' }
  });
  assert.equal(currentUser.status, 200);
  assert.equal((await currentUser.json()).user.email, 'test@example.com');

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: sessionCookie, connection: 'close' }
  });
  assert.equal(logout.status, 200);

  const unauthenticated = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { connection: 'close' }
  });
  assert.equal(unauthenticated.status, 401);
});

test('registration rejects invalid passwords and duplicate email addresses', async () => {
  const weakPassword = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({ name: 'Another User', email: 'other@example.com', password: 'short' })
  });
  assert.equal(weakPassword.status, 400);

  const duplicate = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'a-strong-password' })
  });
  assert.equal(duplicate.status, 409);
});
