const prisma = require('../config/prisma');
const { farmAccessWhere } = require('../utils/farmAccess');

// Una actividad cuelga de un Crop O de un LivestockBatch — nunca ambos. El
// helper de "dueño" del padre depende de cuál de los dos parámetros llega
// en la URL (cropId cuando se monta bajo /crops/:cropId/activities,
// batchId cuando se monta bajo /livestock/:batchId/activities — ver
// crops.routes.js y livestock.routes.js, que reutilizan este mismo router).
const cropOwned = (cropId, userId) =>
  prisma.crop.findFirst({ where: { id: Number(cropId), farm: farmAccessWhere(userId) } });

const batchOwned = (batchId, userId) =>
  prisma.livestockBatch.findFirst({ where: { id: Number(batchId), farm: farmAccessWhere(userId) } });

const activityOwned = (id, userId) =>
  prisma.activity.findFirst({
    where: {
      id: Number(id),
      OR: [
        { crop: { farm: farmAccessWhere(userId) } },
        { livestockBatch: { farm: farmAccessWhere(userId) } },
      ],
    },
  });

exports.list = async (req, res, next) => {
  try {
    const { cropId, batchId } = req.params;
    const where = {};
    if (cropId) {
      if (!await cropOwned(cropId, req.userId)) return res.status(404).json({ message: 'Cultivo no encontrado' });
      where.cropId = Number(cropId);
    } else {
      if (!await batchOwned(batchId, req.userId)) return res.status(404).json({ message: 'Lote no encontrado' });
      where.livestockBatchId = Number(batchId);
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        _count: { select: { jornales: true } },
        jornales: { select: { days: true, dailyValue: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const enriched = activities.map(a => ({
      ...a,
      totalJornales: a.jornales.reduce((s, j) => s + j.days, 0),
      totalCostJornales: a.jornales.reduce((s, j) => s + j.days * j.dailyValue, 0),
    }));

    res.json(enriched);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const activity = await prisma.activity.findFirst({
      where: {
        id: Number(req.params.id),
        OR: [
          { crop: { farm: farmAccessWhere(req.userId) } },
          { livestockBatch: { farm: farmAccessWhere(req.userId) } },
        ],
      },
      include: {
        jornales: { include: { worker: true }, orderBy: { date: 'desc' } },
        crop: { select: { id: true, name: true, farmId: true } },
        livestockBatch: { select: { id: true, name: true, farmId: true } },
      },
    });
    if (!activity) return res.status(404).json({ message: 'Actividad no encontrada' });
    res.json(activity);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { cropId, batchId } = req.params;
    if (cropId) {
      if (!await cropOwned(cropId, req.userId)) return res.status(404).json({ message: 'Cultivo no encontrado' });
    } else {
      if (!await batchOwned(batchId, req.userId)) return res.status(404).json({ message: 'Lote no encontrado' });
    }

    const { name, category, startDate, endDate, description } = req.body;
    const activity = await prisma.activity.create({
      data: {
        name, category,
        cropId: cropId ? Number(cropId) : null,
        livestockBatchId: batchId ? Number(batchId) : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        description,
      },
    });
    res.status(201).json(activity);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const activity = await activityOwned(req.params.id, req.userId);
    if (!activity) return res.status(404).json({ message: 'Actividad no encontrada' });

    const { name, category, startDate, endDate, status, description } = req.body;
    const updated = await prisma.activity.update({
      where: { id: Number(req.params.id) },
      data: {
        name, category, status, description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const activity = await activityOwned(req.params.id, req.userId);
    if (!activity) return res.status(404).json({ message: 'Actividad no encontrada' });

    await prisma.activity.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};
