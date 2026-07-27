const prisma = require('../config/prisma');

const farmOwned = (farmId, userId) =>
  prisma.farm.findFirst({ where: { id: Number(farmId), userId } });

const includeRefs = { crop: { select: { id: true, name: true } }, livestockBatch: { select: { id: true, name: true } } };

exports.list = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    if (!await farmOwned(farmId, req.userId)) return res.status(404).json({ message: 'Finca no encontrada' });

    const { type, category, from, to } = req.query;
    const where = { farmId: Number(farmId) };
    if (type) where.type = type;
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: includeRefs,
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    if (!await farmOwned(farmId, req.userId)) return res.status(404).json({ message: 'Finca no encontrada' });

    const { type, category, amount, date, description, cropId, livestockBatchId } = req.body;
    const transaction = await prisma.transaction.create({
      data: {
        farmId: Number(farmId), type, category,
        amount: Number(amount),
        date: new Date(date),
        description,
        cropId: cropId ? Number(cropId) : null,
        livestockBatchId: livestockBatchId ? Number(livestockBatchId) : null,
      },
      include: includeRefs,
    });
    res.status(201).json(transaction);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: Number(req.params.id), farm: { userId: req.userId } },
    });
    if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' });

    const { type, category, amount, date, description, cropId, livestockBatchId } = req.body;
    const updated = await prisma.transaction.update({
      where: { id: Number(req.params.id) },
      data: {
        type, category,
        amount: amount ? Number(amount) : undefined,
        date: date ? new Date(date) : undefined,
        description,
        cropId: cropId !== undefined ? (cropId ? Number(cropId) : null) : undefined,
        livestockBatchId: livestockBatchId !== undefined ? (livestockBatchId ? Number(livestockBatchId) : null) : undefined,
      },
      include: includeRefs,
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: Number(req.params.id), farm: { userId: req.userId } },
    });
    if (!tx) return res.status(404).json({ message: 'Transacción no encontrada' });

    await prisma.transaction.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};
