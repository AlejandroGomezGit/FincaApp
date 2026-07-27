const {
  linearRegression,
  buildMonthlyBuckets,
  projectFinance,
  computeCropYieldTrend,
} = require('../services/forecast.service');

describe('linearRegression', () => {
  it('encuentra la pendiente e intercepto exactos de una recta perfecta', () => {
    const points = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }]; // y = 2x + 1
    const { slope, intercept } = linearRegression(points);
    expect(slope).toBeCloseTo(2);
    expect(intercept).toBeCloseTo(1);
  });

  it('con un solo punto devuelve pendiente 0 e intercepto = ese valor', () => {
    expect(linearRegression([{ x: 5, y: 42 }])).toEqual({ slope: 0, intercept: 42 });
  });

  it('con cero puntos no lanza error', () => {
    expect(linearRegression([])).toEqual({ slope: 0, intercept: 0 });
  });
});

describe('buildMonthlyBuckets', () => {
  it('devuelve un arreglo vacío sin transacciones', () => {
    expect(buildMonthlyBuckets([])).toEqual([]);
  });

  it('agrupa ingresos y egresos del mes actual en un solo bucket', () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), 15);
    const transactions = [
      { type: 'INCOME', amount: 1000, date: today },
      { type: 'EXPENSE', amount: 300, date: today },
      { type: 'EXPENSE', amount: 200, date: today },
    ];
    const buckets = buildMonthlyBuckets(transactions);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ income: 1000, expense: 500, balance: 500 });
  });

  it('rellena con ceros los meses intermedios sin transacciones', () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const transactions = [
      { type: 'INCOME', amount: 500, date: threeMonthsAgo },
      { type: 'INCOME', amount: 900, date: now },
    ];
    const buckets = buildMonthlyBuckets(transactions);
    expect(buckets).toHaveLength(3); // mes-2, mes-1 (vacío), mes actual
    expect(buckets[1].income).toBe(0);
    expect(buckets[1].expense).toBe(0);
  });

  it('recorta el historial a un máximo de 12 meses', () => {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);
    const transactions = [
      { type: 'INCOME', amount: 100, date: twoYearsAgo },
      { type: 'INCOME', amount: 200, date: now },
    ];
    const buckets = buildMonthlyBuckets(transactions);
    expect(buckets.length).toBeLessThanOrEqual(12);
    // la transacción de hace 2 años queda fuera de la ventana, así que no
    // debería aparecer sumada en ningún bucket
    const totalIncome = buckets.reduce((s, b) => s + b.income, 0);
    expect(totalIncome).toBe(200);
  });
});

describe('projectFinance', () => {
  it('con menos de 3 meses de historial usa el método "average"', () => {
    const buckets = [
      { year: 2026, month: 0, income: 1000, expense: 200, balance: 800 },
      { year: 2026, month: 1, income: 1200, expense: 300, balance: 900 },
    ];
    const result = projectFinance(buckets, 3);
    expect(result.method).toBe('average');
    expect(result.insufficientData).toBe(true);
    expect(result.projection).toHaveLength(3);
  });

  it('con 3+ meses de historial usa regresión y nunca proyecta valores negativos', () => {
    const buckets = [
      { year: 2026, month: 0, income: 1000, expense: 3000, balance: -2000 },
      { year: 2026, month: 1, income: 900, expense: 2500, balance: -1600 },
      { year: 2026, month: 2, income: 800, expense: 2000, balance: -1200 }, // tendencia de gasto a la baja
    ];
    const result = projectFinance(buckets, 3);
    expect(result.method).toBe('regression');
    expect(result.insufficientData).toBe(false);
    for (const p of result.projection) {
      expect(p.income).toBeGreaterThanOrEqual(0);
      expect(p.expense).toBeGreaterThanOrEqual(0);
    }
  });

  it('los meses proyectados continúan cronológicamente después del último histórico', () => {
    const buckets = [
      { year: 2025, month: 10, income: 100, expense: 50, balance: 50 },
      { year: 2025, month: 11, income: 100, expense: 50, balance: 50 },
      { year: 2026, month: 0, income: 100, expense: 50, balance: 50 },
    ];
    const result = projectFinance(buckets, 2);
    expect(result.projection[0]).toMatchObject({ year: 2026, month: 1 });
    expect(result.projection[1]).toMatchObject({ year: 2026, month: 2 });
  });
});

describe('computeCropYieldTrend', () => {
  it('con menos de 2 cosechas reales marca insufficientData', () => {
    const result = computeCropYieldTrend([
      { projectedDate: '2026-01-01', actualQuantity: null },
      { projectedDate: '2026-02-01', actualQuantity: 300 },
    ]);
    expect(result.insufficientData).toBe(true);
    expect(result.nextProjected).toBeNull();
  });

  it('con 2+ cosechas reales proyecta la siguiente por regresión', () => {
    const result = computeCropYieldTrend([
      { projectedDate: '2026-01-01', actualQuantity: 100 },
      { projectedDate: '2026-02-01', actualQuantity: 200 },
      { projectedDate: '2026-03-01', actualQuantity: 300 },
    ]);
    expect(result.insufficientData).toBe(false);
    expect(result.nextProjected).toBeCloseTo(400);
  });
});
