const prisma = require('../config/prisma');
const { buildMonthlyBuckets, projectFinance, computeCropYieldTrend } = require('../services/forecast.service');
const { farmAccessWhere } = require('../utils/farmAccess');

exports.forecast = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const farm = await prisma.farm.findFirst({ where: { id: Number(farmId), ...farmAccessWhere(req.userId) } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const [transactions, crops] = await Promise.all([
      prisma.transaction.findMany({
        where: { farmId: Number(farmId) },
        select: { type: true, amount: true, date: true },
      }),
      prisma.crop.findMany({
        where: { farmId: Number(farmId) },
        include: { harvestProjections: true },
      }),
    ]);

    const buckets = buildMonthlyBuckets(transactions);
    const finance = projectFinance(buckets, 3);

    const cropYield = crops.map((c) => ({
      cropId: c.id,
      cropName: c.name,
      cropType: c.type,
      ...computeCropYieldTrend(c.harvestProjections),
    }));

    res.json({ finance, cropYield });
  } catch (err) { next(err); }
};
