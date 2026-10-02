const prisma = require('../config/prisma');
const { farmAccessWhere } = require('../utils/farmAccess');

const farmOwned = async (farmId, userId) =>
  prisma.farm.findFirst({ where: { id: Number(farmId), ...farmAccessWhere(userId) } });

exports.list = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    if (!await farmOwned(farmId, req.userId)) return res.status(404).json({ message: 'Finca no encontrada' });

    const crops = await prisma.crop.findMany({
      where: { farmId: Number(farmId) },
      include: { _count: { select: { activities: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(crops);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const crop = await prisma.crop.findFirst({
      where: { id: Number(req.params.id), farm: farmAccessWhere(req.userId) },
      include: {
        activities: { include: { _count: { select: { jornales: true } } }, orderBy: { startDate: 'desc' } },
        harvestProjections: { orderBy: { projectedDate: 'asc' } },
      },
    });
    if (!crop) return res.status(404).json({ message: 'Cultivo no encontrado' });
    res.json(crop);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    if (!await farmOwned(farmId, req.userId)) return res.status(404).json({ message: 'Finca no encontrada' });

    const { name, type, hectares, plantingDate, expectedHarvestDate, notes } = req.body;
    const crop = await prisma.crop.create({
      data: {
        name, type, farmId: Number(farmId),
        hectares: hectares ? Number(hectares) : null,
        plantingDate: plantingDate ? new Date(plantingDate) : null,
        expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : null,
        notes,
      },
    });
    res.status(201).json(crop);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const crop = await prisma.crop.findFirst({ where: { id: Number(req.params.id), farm: farmAccessWhere(req.userId) } });
    if (!crop) return res.status(404).json({ message: 'Cultivo no encontrado' });

    const { name, type, hectares, plantingDate, expectedHarvestDate, status, notes } = req.body;
    const updated = await prisma.crop.update({
      where: { id: Number(req.params.id) },
      data: {
        name, type, status,
        hectares: hectares ? Number(hectares) : null,
        plantingDate: plantingDate ? new Date(plantingDate) : null,
        expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : null,
        notes,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const crop = await prisma.crop.findFirst({ where: { id: Number(req.params.id), farm: farmAccessWhere(req.userId) } });
    if (!crop) return res.status(404).json({ message: 'Cultivo no encontrado' });

    await prisma.crop.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};
