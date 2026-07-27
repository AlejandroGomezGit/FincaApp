require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map((o) => o.trim());

const app = express();

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== 'test' }));
app.use(generalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'weather-service' }));
// weather-service no tiene base de datos propia, así que "ready" solo confirma
// que el proceso está arriba — no hay dependencia externa que bloquee el arranque.
app.get('/ready', (req, res) => res.json({ status: 'ready' }));

app.use('/api', require('./routes/weather.routes'));

app.use(errorHandler);

module.exports = app;
