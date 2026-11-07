const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { getJwtSecret } = require('../config/auth');
const { loginUser, registerUser, toPublicUser } = require('../services/authServices');

const COOKIE_NAME = 'session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };
}

function setSessionCookie(res, userId) {
  const token = jwt.sign({}, getJwtSecret(), {
    subject: userId,
    expiresIn: '7d'
  });

  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SESSION_DURATION_MS
  });
}

async function register(req, res, next) {
  try {
    const user = await registerUser(req.body || {});
    setSessionCookie(res, user.id);
    res.status(201).json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { user, userId } = await loginUser(req.body || {});
    setSessionCookie(res, userId);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

async function currentUser(req, res, next) {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      res.clearCookie(COOKIE_NAME, cookieOptions());
      res.status(401).json({ success: false, message: 'Please log in to continue' });
      return;
    }

    res.status(200).json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.status(200).json({ success: true, message: 'Logged out successfully' });
}

module.exports = { currentUser, login, logout, register };
