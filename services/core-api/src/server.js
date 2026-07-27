require('dotenv').config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'INTERNAL_SERVICE_TOKEN'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`core-api: faltan variables de entorno requeridas: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./app');
const internalApp = require('./internalApp');

const PORT = process.env.PORT || 4000;
const INTERNAL_PORT = process.env.INTERNAL_PORT || 4011;

app.listen(PORT, () => console.log(`core-api escuchando en http://localhost:${PORT}`));
internalApp.listen(INTERNAL_PORT, () => console.log(`core-api (interno) escuchando en http://localhost:${INTERNAL_PORT}`));
