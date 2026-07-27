require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth.routes'));

app.use('/api/farms', auth, require('./routes/farms.routes'));
app.use('/api/farms/:farmId/crops', auth, require('./routes/crops.routes'));
app.use('/api/farms/:farmId/workers', auth, require('./routes/workers.routes'));
app.use('/api/farms/:farmId/transactions', auth, require('./routes/transactions.routes'));
app.use('/api/farms/:farmId/dashboard', auth, require('./routes/dashboard.routes'));
app.use('/api/farms/:farmId/analytics', auth, require('./routes/analytics.routes'));
app.use('/api/farms/:farmId/weather', auth, require('./routes/weather.routes'));

app.use(errorHandler);

module.exports = app;
