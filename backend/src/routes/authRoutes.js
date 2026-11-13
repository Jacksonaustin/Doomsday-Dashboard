const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const loginRateLimiter = require('../middleware/loginRateLimiter');
const { currentUser, login, logout, register } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.get('/me', authMiddleware, currentUser);

module.exports = router;
