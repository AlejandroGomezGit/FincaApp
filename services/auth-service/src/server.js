require('dotenv').config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`auth-service: faltan variables de entorno requeridas: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`auth-service escuchando en http://localhost:${PORT}`));
