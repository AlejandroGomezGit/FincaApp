require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map((o) => o.trim());

const app = express();

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== 'test' }));
app.use(generalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));
app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));

app.use(errorHandler);

module.exports = app;
