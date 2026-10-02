const prisma = require('../config/prisma');
const { farmAccessWhere } = require('../utils/farmAccess');

// La actividad padre puede colgar de un cultivo o de un lote de ganado (ver
// activities.controller.js) — se chequea ownership por cualquiera de los dos.
const activityOwned = (activityId, userId) =>
  prisma.activity.findFirst({
    where: {
      id: Number(activityId),
      OR: [
        { crop: { farm: farmAccessWhere(userId) } },
        { livestockBatch: { farm: farmAccessWhere(userId) } },
      ],
    },
  });

exports.list = async (req, res, next) => {
  try {
    const { activityId } = req.params;
    if (!await activityOwned(activityId, req.userId)) return res.status(404).json({ message: 'Actividad no encontrada' });

    const jornales = await prisma.jornal.findMany({
      where: { activityId: Number(activityId) },
      include: { worker: true },
      orderBy: { date: 'desc' },
    });
    res.json(jornales);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { activityId } = req.params;
    if (!await activityOwned(activityId, req.userId)) return res.status(404).json({ message: 'Actividad no encontrada' });

    const { workerId, date, days, dailyValue, notes } = req.body;
    const jornal = await prisma.jornal.create({
      data: {
        workerId: Number(workerId),
        activityId: Number(activityId),
        date: new Date(date),
        days: Number(days),
        dailyValue: Number(dailyValue),
        notes,
      },
      include: { worker: true },
    });
    res.status(201).json(jornal);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const jornal = await prisma.jornal.findFirst({
      where: {
        id: Number(req.params.id),
        activity: {
          OR: [
            { crop: { farm: farmAccessWhere(req.userId) } },
            { livestockBatch: { farm: farmAccessWhere(req.userId) } },
          ],
        },
      },
    });
    if (!jornal) return res.status(404).json({ message: 'Jornal no encontrado' });

    const { workerId, date, days, dailyValue, notes } = req.body;
    const updated = await prisma.jornal.update({
      where: { id: Number(req.params.id) },
      data: {
        workerId: workerId ? Number(workerId) : undefined,
        date: date ? new Date(date) : undefined,
        days: days ? Number(days) : undefined,
        dailyValue: dailyValue ? Number(dailyValue) : undefined,
        notes,
      },
      include: { worker: true },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const jornal = await prisma.jornal.findFirst({
      where: {
        id: Number(req.params.id),
        activity: {
          OR: [
            { crop: { farm: farmAccessWhere(req.userId) } },
            { livestockBatch: { farm: farmAccessWhere(req.userId) } },
          ],
        },
      },
    });
    if (!jornal) return res.status(404).json({ message: 'Jornal no encontrado' });

    await prisma.jornal.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};
