const mongoose = require('mongoose');

async function connectDatabase(mongoUri) {
  if (!mongoUri) {
    throw new Error('MONGO_URI is required to connect to MongoDB');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

module.exports = connectDatabase;
