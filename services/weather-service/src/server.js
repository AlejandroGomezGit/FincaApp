require('dotenv').config();

const REQUIRED_ENV = ['JWT_SECRET', 'INTERNAL_SERVICE_TOKEN'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`weather-service: faltan variables de entorno requeridas: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`weather-service escuchando en http://localhost:${PORT}`));
