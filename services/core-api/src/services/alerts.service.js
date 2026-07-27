// Motor de alertas tempranas: 6 reglas, todas comparando contra el promedio
// histórico de la propia finca (nunca umbrales fijos hardcodeados). Mismo
// patrón que weather-service/src/services/recommendations.service.js — una
// función pura que recibe datos ya consultados y devuelve una lista de
// alertas, fácil de testear sin mockear Prisma.
const { linearRegression, buildMonthlyBuckets } = require('./forecast.service');

const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2 };

const CATEGORY_LABELS = {
  SIEMBRA: 'siembra', FERTILIZACION: 'fertilización', FUMIGACION: 'fumigación',
  PODA: 'poda', COSECHA: 'cosecha', MANTENIMIENTO: 'mantenimiento', RIEGO: 'riego',
  VACUNACION: 'vacunación', ALIMENTACION: 'alimentación', MANEJO_ANIMAL: 'manejo animal', OTRO: 'otro',
};

const formatCOP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function ruleJornalesAnomalia(activities) {
  const alerts = [];
  const completed = activities.filter((a) => a.status === 'COMPLETED');
  const byCategory = {};
  for (const a of completed) (byCategory[a.category] ??= []).push(a);

  for (const a of activities) {
    if (a.status === 'CANCELLED') continue;
    const historical = (byCategory[a.category] || []).filter((h) => h.id !== a.id);
    if (historical.length < 2) continue; // no hay suficiente historial para comparar
    const avg = historical.reduce((s, h) => s + h.totalDays, 0) / historical.length;
    if (avg <= 0 || a.totalDays <= avg * 1.5) continue;

    const subject = a.cropName || a.livestockBatchName || 'la finca';
    alerts.push({
      id: `jornales-${a.id}`,
      severity: 'warning',
      icon: 'work',
      title: 'Jornales por encima de lo normal',
      message: `"${a.name}" (${subject}) lleva ${a.totalDays} jornales — lo normal para ${CATEGORY_LABELS[a.category] || a.category} es cerca de ${avg.toFixed(1)}.`,
      relatedActivityId: a.id,
    });
  }
  return alerts;
}

function ruleActividadVencida(activities, today) {
  const alerts = [];
  for (const a of activities) {
    if (a.status !== 'IN_PROGRESS') continue;
    const days = Math.floor((today - new Date(a.startDate)) / 86400000);
    if (days <= 30) continue;

    const subject = a.cropName || a.livestockBatchName || 'la finca';
    alerts.push({
      id: `vencida-${a.id}`,
      severity: 'warning',
      icon: 'schedule',
      title: 'Actividad sin cerrar hace tiempo',
      message: `"${a.name}" (${subject}) lleva ${days} días en curso sin marcarse como completada.`,
      relatedActivityId: a.id,
    });
  }
  return alerts;
}

function ruleMargenNegativo(crops, transactions, today) {
  const alerts = [];
  for (const c of crops) {
    if (!c.plantingDate) continue;
    const daysSincePlanted = Math.floor((today - new Date(c.plantingDate)) / 86400000);
    if (daysSincePlanted < 60) continue; // cultivo recién sembrado: aún no debería tener margen positivo

    const cropTx = transactions.filter((t) => t.cropId === c.id);
    if (!cropTx.length) continue;
    const income = cropTx.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = cropTx.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    if (income - expense >= 0) continue;

    alerts.push({
      id: `margen-${c.id}`,
      severity: 'danger',
      icon: 'trending_down',
      title: 'Cultivo con margen negativo',
      message: `"${c.name}" lleva ${formatCOP(expense)} en gastos contra ${formatCOP(income)} en ingresos desde que se sembró.`,
      relatedCropId: c.id,
    });
  }
  return alerts;
}

function ruleCostoPorHectareaSubiendo(transactions, totalCropHectares) {
  if (!totalCropHectares || totalCropHectares <= 0) return [];
  const buckets = buildMonthlyBuckets(transactions);
  if (buckets.length < 3) return [];

  const points = buckets.map((b, i) => ({ x: i, y: b.expense / totalCropHectares }));
  const { slope } = linearRegression(points);
  const avgCostPerHa = points.reduce((s, p) => s + p.y, 0) / points.length;
  if (avgCostPerHa <= 0 || slope <= avgCostPerHa * 0.15) return [];

  return [{
    id: 'costo-hectarea-subiendo',
    severity: 'warning',
    icon: 'trending_up',
    title: 'El costo por hectárea viene subiendo',
    message: `En los últimos ${buckets.length} meses el gasto por hectárea de la finca ha venido subiendo cerca de ${formatCOP(slope)} cada mes.`,
  }];
}

function ruleMortalidadAlta(livestockBatches, mortalityRecords, today) {
  const alerts = [];
  for (const batch of livestockBatches) {
    const records = mortalityRecords.filter((m) => m.batchId === batch.id);
    if (records.length < 2) continue;

    const byMonth = {};
    for (const r of records) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      byMonth[key] = (byMonth[key] || 0) + r.quantity;
    }
    const currentKey = `${today.getFullYear()}-${today.getMonth()}`;
    const currentTotal = byMonth[currentKey] || 0;
    const otherMonths = Object.entries(byMonth).filter(([k]) => k !== currentKey).map(([, v]) => v);
    if (!otherMonths.length || currentTotal === 0) continue;

    const avg = otherMonths.reduce((s, v) => s + v, 0) / otherMonths.length;
    if (avg <= 0 || currentTotal <= avg * 1.5) continue;

    alerts.push({
      id: `mortalidad-${batch.id}`,
      severity: 'danger',
      icon: 'warning',
      title: 'Mortalidad alta en un lote',
      message: `"${batch.name}" registra ${currentTotal} baja(s) este mes, por encima del promedio histórico de ${avg.toFixed(1)}.`,
      relatedBatchId: batch.id,
    });
  }
  return alerts;
}

function ruleProduccionCayendo(livestockBatches, productionRecords) {
  const alerts = [];
  for (const batch of livestockBatches) {
    const records = productionRecords
      .filter((p) => p.batchId === batch.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (records.length < 4) continue;

    const points = records.map((r, i) => ({ x: i, y: r.quantity }));
    const { slope } = linearRegression(points);
    const avg = points.reduce((s, p) => s + p.y, 0) / points.length;
    if (avg <= 0 || slope >= -avg * 0.05) continue;

    alerts.push({
      id: `produccion-${batch.id}`,
      severity: 'warning',
      icon: 'trending_down',
      title: 'La producción viene bajando',
      message: `La producción de "${batch.name}" muestra una tendencia a la baja en los últimos registros.`,
      relatedBatchId: batch.id,
    });
  }
  return alerts;
}

exports.generate = ({
  activities = [],
  crops = [],
  transactions = [],
  totalCropHectares = 0,
  livestockBatches = [],
  mortalityRecords = [],
  productionRecords = [],
  today = new Date(),
}) => {
  const alerts = [
    ...ruleJornalesAnomalia(activities),
    ...ruleActividadVencida(activities, today),
    ...ruleMargenNegativo(crops, transactions, today),
    ...ruleCostoPorHectareaSubiendo(transactions, totalCropHectares),
    ...ruleMortalidadAlta(livestockBatches, mortalityRecords, today),
    ...ruleProduccionCayendo(livestockBatches, productionRecords),
  ];

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
};
