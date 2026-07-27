const prisma = require('../config/prisma');

exports.summary = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const farm = await prisma.farm.findFirst({ where: { id: Number(farmId), userId: req.userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalCrops,
      activeCrops,
      totalWorkers,
      totalActivities,
      activeActivities,
      monthIncome,
      monthExpense,
      yearIncome,
      yearExpense,
      upcomingHarvests,
    ] = await Promise.all([
      prisma.crop.count({ where: { farmId: Number(farmId) } }),
      prisma.crop.count({ where: { farmId: Number(farmId), status: 'ACTIVE' } }),
      prisma.worker.count({ where: { farmId: Number(farmId), active: true } }),
      prisma.activity.count({ where: { crop: { farmId: Number(farmId) } } }),
      prisma.activity.count({ where: { crop: { farmId: Number(farmId) }, status: 'IN_PROGRESS' } }),
      prisma.transaction.aggregate({
        where: { farmId: Number(farmId), type: 'INCOME', date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { farmId: Number(farmId), type: 'EXPENSE', date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { farmId: Number(farmId), type: 'INCOME', date: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { farmId: Number(farmId), type: 'EXPENSE', date: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      prisma.harvestProjection.findMany({
        where: { crop: { farmId: Number(farmId) }, projectedDate: { gte: now }, actualQuantity: null },
        include: { crop: { select: { name: true } } },
        orderBy: { projectedDate: 'asc' },
        take: 5,
      }),
    ]);

    res.json({
      totalCrops, activeCrops, totalWorkers,
      totalActivities, activeActivities,
      monthIncome: monthIncome._sum.amount || 0,
      monthExpense: monthExpense._sum.amount || 0,
      monthBalance: (monthIncome._sum.amount || 0) - (monthExpense._sum.amount || 0),
      yearIncome: yearIncome._sum.amount || 0,
      yearExpense: yearExpense._sum.amount || 0,
      yearBalance: (yearIncome._sum.amount || 0) - (yearExpense._sum.amount || 0),
      upcomingHarvests,
    });
  } catch (err) { next(err); }
};

exports.monthlyBalance = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const farm = await prisma.farm.findFirst({ where: { id: Number(farmId), userId: req.userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const year = Number(req.query.year) || new Date().getFullYear();
    const transactions = await prisma.transaction.findMany({
      where: {
        farmId: Number(farmId),
        date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) },
      },
      select: { type: true, amount: true, date: true },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
      balance: 0,
    }));

    for (const tx of transactions) {
      const m = tx.date.getMonth();
      if (tx.type === 'INCOME') months[m].income += tx.amount;
      else months[m].expense += tx.amount;
    }
    for (const m of months) m.balance = m.income - m.expense;

    res.json(months);
  } catch (err) { next(err); }
};

exports.activityCosts = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const farm = await prisma.farm.findFirst({ where: { id: Number(farmId), userId: req.userId } });
    if (!farm) return res.status(404).json({ message: 'Finca no encontrada' });

    const activities = await prisma.activity.findMany({
      where: { crop: { farmId: Number(farmId) } },
      include: {
        jornales: { select: { days: true, dailyValue: true } },
        crop: { select: { name: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const result = activities.map(a => ({
      id: a.id,
      name: a.name,
      category: a.category,
      status: a.status,
      cropName: a.crop.name,
      startDate: a.startDate,
      endDate: a.endDate,
      totalDays: a.jornales.reduce((s, j) => s + j.days, 0),
      totalCost: a.jornales.reduce((s, j) => s + j.days * j.dailyValue, 0),
    }));

    res.json(result);
  } catch (err) { next(err); }
};
