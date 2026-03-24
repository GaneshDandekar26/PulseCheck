const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRouter = require('./routes/auth');
const authenticateToken = require('./middleware/authenticateToken');
const endpointsRouter = require('./routes/endpoints');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

// All routes added after this middleware require a valid JWT
app.use(authenticateToken);

app.use('/api/endpoints', endpointsRouter);

module.exports = app;
