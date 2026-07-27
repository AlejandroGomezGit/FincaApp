const prisma = require('../config/prisma');

const cropOwned = (cropId, userId) =>
  prisma.crop.findFirst({ where: { id: Number(cropId), farm: { userId } } });

exports.list = async (req, res, next) => {
  try {
    const { cropId } = req.params;
    if (!await cropOwned(cropId, req.userId)) return res.status(404).json({ message: 'Cultivo no encontrado' });

    const projections = await prisma.harvestProjection.findMany({
      where: { cropId: Number(cropId) },
      orderBy: { projectedDate: 'asc' },
    });
    res.json(projections);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { cropId } = req.params;
    if (!await cropOwned(cropId, req.userId)) return res.status(404).json({ message: 'Cultivo no encontrado' });

    const { projectedDate, projectedQuantity, unit, unitPrice, notes } = req.body;
    const projection = await prisma.harvestProjection.create({
      data: {
        cropId: Number(cropId),
        projectedDate: new Date(projectedDate),
        projectedQuantity: Number(projectedQuantity),
        unit: unit || 'kg',
        unitPrice: unitPrice ? Number(unitPrice) : null,
        notes,
      },
    });
    res.status(201).json(projection);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const proj = await prisma.harvestProjection.findFirst({
      where: { id: Number(req.params.id), crop: { farm: { userId: req.userId } } },
    });
    if (!proj) return res.status(404).json({ message: 'Proyección no encontrada' });

    const { projectedDate, projectedQuantity, actualQuantity, unit, unitPrice, notes } = req.body;
    const updated = await prisma.harvestProjection.update({
      where: { id: Number(req.params.id) },
      data: {
        projectedDate: projectedDate ? new Date(projectedDate) : undefined,
        projectedQuantity: projectedQuantity ? Number(projectedQuantity) : undefined,
        actualQuantity: actualQuantity !== undefined ? Number(actualQuantity) : undefined,
        unit, unitPrice: unitPrice ? Number(unitPrice) : undefined,
        notes,
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const proj = await prisma.harvestProjection.findFirst({
      where: { id: Number(req.params.id), crop: { farm: { userId: req.userId } } },
    });
    if (!proj) return res.status(404).json({ message: 'Proyección no encontrada' });

    await prisma.harvestProjection.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};
