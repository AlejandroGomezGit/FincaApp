const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY_DAYS = Number(process.env.JWT_REFRESH_EXPIRY_DAYS || 7);

exports.generateAccessToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY });

// Los refresh tokens son opacos (no JWT): un valor aleatorio de alta entropía
// que solo existe hasheado en la base de datos, para poder revocarlos de
// verdad (un JWT de refresh firmado no se puede "desemitir" sin una lista de
// revocación aparte, así que aquí se evita ese problema desde el diseño).
exports.generateRefreshToken = () => crypto.randomBytes(48).toString('hex');

exports.hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

exports.refreshExpiryDate = () => new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
