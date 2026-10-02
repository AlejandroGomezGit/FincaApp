// Listener interno de auth-service: NO se expone por el gateway/Ingress
// público, solo alcanzable dentro de la red de contenedores/cluster
// (reforzado además por NetworkPolicy en k8s). Hoy solo lo usa core-api,
// para resolver un email a userId al invitar un colaborador a una finca
// (core-api no tiene acceso directo a la tabla User, que es dueña
// auth-service). Mismo patrón que core-api/internalApp.js.
require('dotenv').config();
const express = require('express');
const prisma = require('./config/prisma');
const internalAuth = require('./middleware/internalAuth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '20kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service-internal' }));

app.use(internalAuth);

app.get('/internal/users/by-email', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'email requerido' });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) { next(err); }
});

// Lookup en lote (evita N+1 al listar colaboradores de una finca).
app.get('/internal/users/by-ids', async (req, res, next) => {
  try {
    const ids = String(req.query.ids || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) return res.json([]);

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    });
    res.json(users);
  } catch (err) { next(err); }
});

app.use(errorHandler);

module.exports = app;
