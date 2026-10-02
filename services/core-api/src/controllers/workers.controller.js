const prisma = require('../config/prisma');
const { farmAccessWhere } = require('../utils/farmAccess');

const farmOwned = (farmId, userId) =>
  prisma.farm.findFirst({ where: { id: Number(farmId), ...farmAccessWhere(userId) } });

exports.list = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    if (!await farmOwned(farmId, req.userId)) return res.status(404).json({ message: 'Finca no encontrada' });

    const workers = await prisma.worker.findMany({
      where: { farmId: Number(farmId) },
      include: { _count: { select: { jornales: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(workers);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    if (!await farmOwned(farmId, req.userId)) return res.status(404).json({ message: 'Finca no encontrada' });

    const { name, phone, idNumber } = req.body;
    const worker = await prisma.worker.create({ data: { name, phone, idNumber, farmId: Number(farmId) } });
    res.status(201).json(worker);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const worker = await prisma.worker.findFirst({
      where: { id: Number(req.params.id), farm: farmAccessWhere(req.userId) },
    });
    if (!worker) return res.status(404).json({ message: 'Trabajador no encontrado' });

    const { name, phone, idNumber, active } = req.body;
    const updated = await prisma.worker.update({
      where: { id: Number(req.params.id) },
      data: { name, phone, idNumber, active },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const worker = await prisma.worker.findFirst({
      where: { id: Number(req.params.id), farm: farmAccessWhere(req.userId) },
    });
    if (!worker) return res.status(404).json({ message: 'Trabajador no encontrado' });

    await prisma.worker.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};
