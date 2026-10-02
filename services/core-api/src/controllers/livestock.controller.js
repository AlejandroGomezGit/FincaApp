const prisma = require('../config/prisma');
const { farmAccessWhere } = require('../utils/farmAccess');

const farmOwned = (farmId, userId) =>
  prisma.farm.findFirst({ where: { id: Number(farmId), ...farmAccessWhere(userId) } });

exports.list = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    if (!await farmOwned(farmId, req.userId)) return res.status(404).json({ message: 'Finca no encontrada' });

    const batches = await prisma.livestockBatch.findMany({
      where: { farmId: Number(farmId) },
      include: { _count: { select: { animals: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(batches);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const batch = await prisma.livestockBatch.findFirst({
      where: { id: Number(req.params.id), farm: farmAccessWhere(req.userId) },
      include: {
        animals: { orderBy: { createdAt: 'desc' } },
        _count: { select: { activities: true, healthRecords: true, productionRecords: true } },
      },
    });
    if (!batch) return res.status(404).json({ message: 'Lote no encontrado' });
    res.json(batch);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    if (!await farmOwned(farmId, req.userId)) return res.status(404).json({ message: 'Finca no encontrada' });

    const { name, species, purpose, quantity, acquisitionDate, notes } = req.body;
    const batch = await prisma.livestockBatch.create({
      data: {
        name, species, purpose,
        farmId: Number(farmId),
        quantity: quantity ? Number(quantity) : 1,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        notes,
      },
    });
    res.status(201).json(batch);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const batch = await prisma.livestockBatch.findFirst({ where: { id: Number(req.params.id), farm: farmAccessWhere(req.userId) } });
    if (!batch) return res.status(404).json({ message: 'Lote no encontrado' });

    const { name, species, purpose, quantity, acquisitionDate, status, notes } = req.body;
    const updated = await prisma.livestockBatch.update({
      where: { id: Number(req.params.id) },
      data: {
        name, species, purpose, status,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined,
        notes,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const batch = await prisma.livestockBatch.findFirst({ where: { id: Number(req.params.id), farm: farmAccessWhere(req.userId) } });
    if (!batch) return res.status(404).json({ message: 'Lote no encontrado' });

    await prisma.livestockBatch.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};
