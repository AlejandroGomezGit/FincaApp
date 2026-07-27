const rateLimit = require('express-rate-limit');

// Desactivado bajo pruebas automatizadas: los tests hacen muchas más
// peticiones por minuto de las que un usuario real haría, y el propósito
// aquí es probar la lógica de negocio, no volver a probar express-rate-limit.
const skip = () => process.env.NODE_ENV === 'test';

// Límite estricto para endpoints sensibles a fuerza bruta (login/register/refresh).
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

exports.generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});
