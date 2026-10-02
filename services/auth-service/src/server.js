require('dotenv').config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'INTERNAL_SERVICE_TOKEN'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`auth-service: faltan variables de entorno requeridas: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./app');
const internalApp = require('./internalApp');

const PORT = process.env.PORT || 4001;
const INTERNAL_PORT = process.env.INTERNAL_PORT || 4021;

app.listen(PORT, () => console.log(`auth-service escuchando en http://localhost:${PORT}`));
internalApp.listen(INTERNAL_PORT, () => console.log(`auth-service (interno) escuchando en http://localhost:${INTERNAL_PORT}`));
