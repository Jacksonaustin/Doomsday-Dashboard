const mongoose = require('mongoose');

function getHealth(req, res) {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    data: {
      status: databaseConnected ? 'ok' : 'unavailable',
      database: databaseConnected ? 'connected' : 'disconnected'
    },
    message: databaseConnected
      ? 'API is ready'
      : 'Database connection is unavailable'
  });
}

module.exports = { getHealth };
