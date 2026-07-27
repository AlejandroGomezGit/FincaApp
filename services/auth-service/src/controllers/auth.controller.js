const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateAccessToken, generateRefreshToken, hashToken, refreshExpiryDate } = require('../utils/tokens');

const BCRYPT_ROUNDS = 12;

async function issueTokens(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), userId: user.id, expiresAt: refreshExpiryDate() },
  });
  return { accessToken, refreshToken };
}

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'El email ya está registrado' });

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({ data: { name, email, password: hashed } });
    const tokens = await issueTokens(user);
    res.status(201).json({ ...tokens, user: publicUser(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

    const tokens = await issueTokens(user);
    res.json({ ...tokens, user: publicUser(user) });
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken requerido' });

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token inválido o expirado' });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) return res.status(401).json({ message: 'Refresh token inválido' });

    // Rotación: el token usado se revoca y se emite uno nuevo, así un refresh
    // token robado y reutilizado dos veces queda detectado/invalidado.
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const tokens = await issueTokens(user);
    res.json(tokens);
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken) },
        data: { revoked: true },
      });
    }
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) { next(err); }
};

// Endpoint de ejemplo protegido por rol (demuestra el patrón RBAC end-to-end).
exports.listUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
};
