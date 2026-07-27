const prisma = require('../config/prisma');
const { buildMonthlyBuckets } = require('../services/forecast.service');

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
    // core-api nunca hace llamadas HTTP salientes (ni a Open-Meteo ni a nadie):
    // convertir "location" en lat/lng es responsabilidad exclusiva de
    // weather-service, que lo resuelve solo (y de forma perezosa/auto-sanada)
    // la primera vez que se consulta el clima de esta finca.
    const farm = await prisma.farm.create({
      data: { name, location, description, hectares: hectares ? Number(hectares) : null, userId: req.userId },
    });
    res.status(201).json(farm);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const farm = await prisma.farm.findFirst({ where: { id: Number(req.params.id), userId: req.userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const { name, location, description, hectares } = req.body;
    const data = { name, location, description, hectares: hectares ? Number(hectares) : null };

    // Si cambia la ubicación, invalida las coordenadas ya resueltas — el
    // próximo GET /weather en weather-service las vuelve a calcular.
    if (location && location !== farm.location) {
      data.lat = null;
      data.lng = null;
      data.locationResolved = null;
      data.geocodedAt = null;
    }

    const updated = await prisma.farm.update({ where: { id: Number(req.params.id) }, data });
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
