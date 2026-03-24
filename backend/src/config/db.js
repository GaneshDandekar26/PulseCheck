const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    const connection = await mongoose.connect(uri);
    const { host, name, readyState } = connection.connection;
    console.log(`[db] Connected to ${name} on ${host} (state: ${readyState})`);
  } catch (error) {
    console.error('[db] Connection failed', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] Disconnected from MongoDB');
  });
};

module.exports = connectDB;
