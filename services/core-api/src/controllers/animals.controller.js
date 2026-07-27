const prisma = require('../config/prisma');

const batchOwned = (batchId, userId) =>
  prisma.livestockBatch.findFirst({ where: { id: Number(batchId), farm: { userId } } });

exports.list = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    if (!await batchOwned(batchId, req.userId)) return res.status(404).json({ message: 'Lote no encontrado' });

    const animals = await prisma.animal.findMany({
      where: { batchId: Number(batchId) },
      include: { _count: { select: { weightRecords: true, healthRecords: true, reproductionRecords: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(animals);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const animal = await prisma.animal.findFirst({
      where: { id: Number(req.params.id), batch: { farm: { userId: req.userId } } },
      include: {
        weightRecords: { orderBy: { date: 'asc' } },
        healthRecords: { orderBy: { date: 'desc' } },
        reproductionRecords: { orderBy: { date: 'desc' } },
        batch: { select: { id: true, name: true, farmId: true } },
      },
    });
    if (!animal) return res.status(404).json({ message: 'Animal no encontrado' });
    res.json(animal);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    if (!await batchOwned(batchId, req.userId)) return res.status(404).json({ message: 'Lote no encontrado' });

    const { tag, sex, birthDate, breed, notes } = req.body;
    const animal = await prisma.animal.create({
      data: {
        batchId: Number(batchId),
        tag, sex, breed, notes,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });
    res.status(201).json(animal);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const animal = await prisma.animal.findFirst({ where: { id: Number(req.params.id), batch: { farm: { userId: req.userId } } } });
    if (!animal) return res.status(404).json({ message: 'Animal no encontrado' });

    const { tag, sex, birthDate, breed, status, notes } = req.body;
    const updated = await prisma.animal.update({
      where: { id: Number(req.params.id) },
      data: {
        tag, sex, breed, status, notes,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const animal = await prisma.animal.findFirst({ where: { id: Number(req.params.id), batch: { farm: { userId: req.userId } } } });
    if (!animal) return res.status(404).json({ message: 'Animal no encontrado' });

    await prisma.animal.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};
