const prisma = require('../config/prisma');
const alertsService = require('../services/alerts.service');

exports.list = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const farm = await prisma.farm.findFirst({ where: { id: Number(farmId), userId: req.userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const [rawActivities, crops, transactions, livestockBatches, mortalityRecords, productionRecords] = await Promise.all([
      prisma.activity.findMany({
        where: { OR: [{ crop: { farmId: Number(farmId) } }, { livestockBatch: { farmId: Number(farmId) } }] },
        include: {
          jornales: { select: { days: true } },
          crop: { select: { name: true } },
          livestockBatch: { select: { name: true } },
        },
      }),
      prisma.crop.findMany({
        where: { farmId: Number(farmId) },
        select: { id: true, name: true, plantingDate: true, hectares: true },
      }),
      prisma.transaction.findMany({
        where: { farmId: Number(farmId) },
        select: { cropId: true, livestockBatchId: true, type: true, amount: true, date: true },
      }),
      prisma.livestockBatch.findMany({
        where: { farmId: Number(farmId) },
        select: { id: true, name: true },
      }),
      prisma.mortalityRecord.findMany({
        where: { batch: { farmId: Number(farmId) } },
        select: { batchId: true, date: true, quantity: true },
      }),
      prisma.productionRecord.findMany({
        where: { batch: { farmId: Number(farmId) } },
        select: { batchId: true, date: true, quantity: true },
      }),
    ]);

    const activities = rawActivities.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      status: a.status,
      startDate: a.startDate,
      totalDays: a.jornales.reduce((s, j) => s + j.days, 0),
      cropName: a.crop?.name ?? null,
      livestockBatchName: a.livestockBatch?.name ?? null,
    }));

    const totalCropHectares = crops.reduce((s, c) => s + (c.hectares || 0), 0);

    const alerts = alertsService.generate({
      activities, crops, transactions, totalCropHectares,
      livestockBatches, mortalityRecords, productionRecords,
      today: new Date(),
    });

    res.json({ alerts });
  } catch (err) { next(err); }
};
