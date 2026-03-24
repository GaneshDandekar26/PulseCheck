require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initScheduler } = require('./scheduler/pingScheduler');

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB();
    await initScheduler();
    app.listen(PORT, () => {
      console.log(`[server] Listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('[server] Failed to start', error);
    process.exit(1);
  }
};

startServer();
