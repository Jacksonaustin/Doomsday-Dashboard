const { rateLimit } = require('express-rate-limit');

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({
      success: false,
      message: 'Too many accounts created from this network. Please try again later.'
    });
  }
});

module.exports = registerRateLimiter;