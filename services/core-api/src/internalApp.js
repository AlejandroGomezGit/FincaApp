// Listener interno de core-api: NO se expone por el gateway/Ingress público,
// solo es alcanzable dentro de la red de contenedores/cluster (reforzado además
// por NetworkPolicy en k8s — ver k8s/base/networkpolicy.yaml). Es el único punto
// de contacto de weather-service con los datos de una finca, ya que ese servicio
// no tiene acceso directo a la base de datos.
require('dotenv').config();
const express = require('express');
const prisma = require('./config/prisma');
const internalAuth = require('./middleware/internalAuth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '50kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'core-api-internal' }));

app.use(internalAuth);

app.get('/internal/farms/:farmId/weather-context', async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const userId = Number(req.query.userId);
    if (!userId) return res.status(400).json({ message: 'userId requerido' });

    const farm = await prisma.farm.findFirst({ where: { id: Number(farmId), userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const today = new Date();
    const in14Days = new Date(today.getTime() + 14 * 86400000);
    const [activities, crops] = await Promise.all([
      prisma.activity.findMany({
        where: {
          crop: { farmId: farm.id },
          status: { not: 'CANCELLED' },
          startDate: { lte: in14Days },
        },
        include: { crop: { select: { name: true, type: true } } },
      }),
      prisma.crop.findMany({ where: { farmId: farm.id } }),
    ]);

    res.json({
      farmId: farm.id,
      lat: farm.lat,
      lng: farm.lng,
      location: farm.location,
      locationResolved: farm.locationResolved,
      activities,
      crops,
    });
  } catch (err) { next(err); }
});

app.patch('/internal/farms/:farmId/geocode', async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const { lat, lng, resolvedName } = req.body;

    const farm = await prisma.farm.findUnique({ where: { id: Number(farmId) } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const updated = await prisma.farm.update({
      where: { id: Number(farmId) },
      data: { lat, lng, locationResolved: resolvedName, geocodedAt: new Date() },
    });
    res.json({ id: updated.id, lat: updated.lat, lng: updated.lng, locationResolved: updated.locationResolved });
  } catch (err) { next(err); }
});

app.use(errorHandler);

module.exports = app;
