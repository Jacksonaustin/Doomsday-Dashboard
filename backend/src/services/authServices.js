const bcrypt = require('bcrypt');
const User = require('../models/user');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateCredentials(email, password) {
  if (
    typeof email !== 'string' ||
    email.trim().length > 254 ||
    !EMAIL_PATTERN.test(email.trim())
  ) {
    throw createError(400, 'Enter a valid email address');
  }

  if (
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH ||
    Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
  ) {
    throw createError(
      400,
      'Password must be at least 8 characters and no more than 72 bytes'
    );
  }
}

function toPublicUser(user) {
  return {
    id: user.id || user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  };
}

async function registerUser({ name, email, password } = {}) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
  validateCredentials(normalizedEmail, password);

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    throw createError(400, 'Name is required and must be 100 characters or fewer');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw createError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    return toPublicUser(user);
  } catch (error) {
    if (error.code === 11000) {
      throw createError(409, 'An account with this email already exists');
    }

    throw error;
  }
}

async function loginUser({ email, password } = {}) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
  validateCredentials(normalizedEmail, password);

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw createError(401, 'Email or password is incorrect');
  }

  return {
    user: toPublicUser(user),
    userId: user.id || user._id.toString()
  };
}

module.exports = { loginUser, registerUser, toPublicUser };