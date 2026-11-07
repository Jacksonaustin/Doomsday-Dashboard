require('dotenv').config();

const app = require('./app');
const connectDatabase = require('./config/database');
const { getJwtSecret } = require('./config/auth');
const mongoose = require('mongoose');

const port = Number(process.env.PORT) || 5000;
let server;
let shuttingDown = false;

async function startServer() {
  getJwtSecret();
  await connectDatabase(process.env.MONGO_URI);

  server = app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

async function stopServer(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received; shutting down`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Failed to shut down the API server cleanly', error);
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => {
  stopServer('SIGINT');
});
process.on('SIGTERM', () => {
  stopServer('SIGTERM');
});

startServer().catch((error) => {
  console.error('Failed to start the API server', error);
  process.exitCode = 1;
});
