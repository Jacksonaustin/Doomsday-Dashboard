const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/auth');

function authMiddleware(req, res, next) {
  const token = req.cookies?.session;

  if (!token) {
    res.status(401).json({ success: false, message: 'Please log in to continue' });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (typeof payload.sub !== 'string') {
      res.status(401).json({ success: false, message: 'Please log in to continue' });
      return;
    }

    req.auth = { userId: payload.sub };
    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.NotBeforeError
    ) {
      res.status(401).json({ success: false, message: 'Please log in to continue' });
      return;
    }

    next(error);
  }
}

module.exports = authMiddleware;
