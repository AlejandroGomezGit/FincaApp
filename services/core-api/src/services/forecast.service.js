const MAX_HISTORY_MONTHS = 12;

function linearRegression(points) {
  const n = points.length;
  if (n < 2) {
    const avg = n === 1 ? points[0].y : 0;
    return { slope: 0, intercept: avg };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function predict({ slope, intercept }, x) {
  return slope * x + intercept;
}

function monthKey(year, month) {
  return year * 12 + month;
}

function buildMonthlyBuckets(transactions) {
  if (transactions.length === 0) return [];

  const now = new Date();
  const dates = transactions.map((t) => new Date(t.date));
  let minDate = dates.reduce((a, b) => (b < a ? b : a));

  const nowKey = monthKey(now.getFullYear(), now.getMonth());
  let startKey = monthKey(minDate.getFullYear(), minDate.getMonth());
  if (nowKey - startKey > MAX_HISTORY_MONTHS - 1) {
    startKey = nowKey - (MAX_HISTORY_MONTHS - 1);
  }

  const buckets = [];
  for (let k = startKey; k <= nowKey; k++) {
    buckets.push({ year: Math.floor(k / 12), month: k % 12, income: 0, expense: 0, balance: 0 });
  }
  const bucketByKey = new Map(buckets.map((b) => [monthKey(b.year, b.month), b]));

  for (const t of transactions) {
    const d = new Date(t.date);
    const k = monthKey(d.getFullYear(), d.getMonth());
    const bucket = bucketByKey.get(k);
    if (!bucket) continue;
    if (t.type === 'INCOME') bucket.income += t.amount;
    else bucket.expense += t.amount;
  }

  for (const b of buckets) b.balance = b.income - b.expense;
  return buckets;
}

function projectSeries(buckets, field, months) {
  const points = buckets.map((b, i) => ({ x: i, y: b[field] }));
  const model = linearRegression(points);
  const projected = [];
  for (let i = 0; i < months; i++) {
    const x = buckets.length + i;
    projected.push(Math.max(0, predict(model, x)));
  }
  return projected;
}

function shiftMonth(year, month, offset) {
  const k = monthKey(year, month) + offset;
  return { year: Math.floor(k / 12), month: k % 12 };
}

exports.linearRegression = linearRegression;
exports.buildMonthlyBuckets = buildMonthlyBuckets;

exports.projectFinance = (buckets, months = 3) => {
  const insufficientData = buckets.length < 3;

  let projectedIncome, projectedExpense;
  if (insufficientData) {
    const avgIncome = buckets.length ? buckets.reduce((s, b) => s + b.income, 0) / buckets.length : 0;
    const avgExpense = buckets.length ? buckets.reduce((s, b) => s + b.expense, 0) / buckets.length : 0;
    projectedIncome = Array(months).fill(avgIncome);
    projectedExpense = Array(months).fill(avgExpense);
  } else {
    projectedIncome = projectSeries(buckets, 'income', months);
    projectedExpense = projectSeries(buckets, 'expense', months);
  }

  const last = buckets[buckets.length - 1] || { year: new Date().getFullYear(), month: new Date().getMonth() };
  const projection = projectedIncome.map((income, i) => {
    const expense = projectedExpense[i];
    const { year, month } = shiftMonth(last.year, last.month, i + 1);
    return { year, month, income, expense, balance: income - expense };
  });

  return {
    history: buckets,
    projection,
    method: insufficientData ? 'average' : 'regression',
    insufficientData,
    monthsOfHistory: buckets.length,
  };
};

exports.computeCropYieldTrend = (harvestProjections) => {
  const withActuals = harvestProjections
    .filter((h) => h.actualQuantity != null)
    .sort((a, b) => new Date(a.projectedDate) - new Date(b.projectedDate));

  if (withActuals.length < 2) {
    return { insufficientData: true, history: withActuals, nextProjected: null };
  }

  const points = withActuals.map((h, i) => ({ x: i, y: h.actualQuantity }));
  const model = linearRegression(points);
  const nextProjected = Math.max(0, predict(model, withActuals.length));

  return { insufficientData: false, history: withActuals, nextProjected };
};
