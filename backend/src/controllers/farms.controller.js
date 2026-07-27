const prisma = require('../config/prisma');
const { geocodeLocation } = require('../services/geocode.service');
const { buildMonthlyBuckets } = require('../services/forecast.service');

async function tryGeocodeAndPersist(farmId, location) {
  const geo = await geocodeLocation(location);
  if (!geo) {
    await prisma.farm.update({ where: { id: farmId }, data: { geocodedAt: new Date() } });
    return null;
  }
  return prisma.farm.update({
    where: { id: farmId },
    data: { lat: geo.lat, lng: geo.lng, locationResolved: geo.resolvedName, geocodedAt: new Date() },
  });
}

exports.list = async (req, res, next) => {
  try {
    const farms = await prisma.farm.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { crops: true, workers: true, transactions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(farms);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const farm = await prisma.farm.findFirst({
      where: { id: Number(req.params.id), userId: req.userId },
      include: {
        crops: { include: { _count: { select: { activities: true } } } },
        workers: { where: { active: true } },
        _count: { select: { transactions: true } },
      },
    });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });
    res.json(farm);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, location, description, hectares } = req.body;
    let farm = await prisma.farm.create({
      data: { name, location, description, hectares: hectares ? Number(hectares) : null, userId: req.userId },
    });

    if (location) {
      const geocoded = await tryGeocodeAndPersist(farm.id, location);
      if (geocoded) farm = geocoded;
    }

    res.status(201).json(farm);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const farm = await prisma.farm.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const { name, location, description, hectares } = req.body;
    let updated = await prisma.farm.update({
      where: { id: Number(req.params.id) },
      data: { name, location, description, hectares: hectares ? Number(hectares) : null },
    });

    if (location && location !== farm.location) {
      const geocoded = await tryGeocodeAndPersist(updated.id, location);
      if (geocoded) updated = geocoded;
    }

    res.json(updated);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const farm = await prisma.farm.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    await prisma.farm.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
};

exports.ranking = async (req, res, next) => {
  try {
    const farms = await prisma.farm.findMany({ where: { userId: req.userId } });

    const withMetrics = await Promise.all(farms.map(async (farm) => {
      const transactions = await prisma.transaction.findMany({
        where: { farmId: farm.id },
        select: { type: true, amount: true, date: true },
      });
      const buckets = buildMonthlyBuckets(transactions);
      const incomeTotal = buckets.reduce((s, b) => s + b.income, 0);
      const expenseTotal = buckets.reduce((s, b) => s + b.expense, 0);
      const netBalance = incomeTotal - expenseTotal;
      return {
        farmId: farm.id,
        name: farm.name,
        location: farm.location,
        hectares: farm.hectares,
        incomeTotal,
        expenseTotal,
        netBalance,
        balancePerHectare: farm.hectares ? netBalance / farm.hectares : null,
      };
    }));

    withMetrics.sort((a, b) => b.netBalance - a.netBalance);
    withMetrics.forEach((f, i) => { f.rank = i + 1; });

    res.json(withMetrics);
  } catch (err) { next(err); }
};
