require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');
const { generalLimiter } = require('./middleware/rateLimiter');

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map((o) => o.trim());

const app = express();

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '200kb' }));
app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== 'test' }));
app.use(generalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'core-api' }));
app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

// auth-service es dueño de /api/auth; weather-service es dueño de /api/farms/:id/weather.
// core-api solo verifica el JWT (auth) que auth-service emitió — no hay llamada
// de red entre servicios para esto, cada uno verifica de forma independiente.
app.use('/api/farms', auth, require('./routes/farms.routes'));
app.use('/api/farms/:farmId/crops', auth, require('./routes/crops.routes'));
app.use('/api/farms/:farmId/workers', auth, require('./routes/workers.routes'));
app.use('/api/farms/:farmId/transactions', auth, require('./routes/transactions.routes'));
app.use('/api/farms/:farmId/dashboard', auth, require('./routes/dashboard.routes'));
app.use('/api/farms/:farmId/analytics', auth, require('./routes/analytics.routes'));

app.use(errorHandler);

module.exports = app;
