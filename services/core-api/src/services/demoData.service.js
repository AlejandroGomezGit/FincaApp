// Fuente única de la finca de ejemplo: la usa tanto prisma/seed.js (fixtures
// de desarrollo) como POST /api/farms/demo (botón "Cargar finca de ejemplo"
// en el estado vacío de Fincas) — antes esta lógica solo vivía en seed.js.
const prisma = require('../config/prisma');

const daysFrom = (ref, n) => new Date(ref.getTime() + n * 86400000);
const monthsAgo = (ref, n, day = 15) => new Date(ref.getFullYear(), ref.getMonth() - n, day);

// referenceDate por defecto es "ahora" — así las fechas relativas (cosecha
// en 65 días, jornal de hace 2 días, etc.) siempre tienen sentido sin
// importar cuándo se dispare el endpoint. seed.js pasa una fecha fija para
// que los datos de desarrollo sean reproducibles entre corridas.
exports.createDemoFarm = async (userId, referenceDate = new Date()) => {
  const ref = referenceDate;
  const daysFromToday = (n) => daysFrom(ref, n);
  const monthsAgoRef = (n, day) => monthsAgo(ref, n, day);

  const farm = await prisma.farm.create({
    data: {
      name: 'Finca La Esperanza (ejemplo)',
      location: 'Huila, Colombia',
      description: 'Finca de ejemplo para explorar cultivos, ganado, jornales, transacciones y alertas tempranas.',
      hectares: 12.5,
      userId,
      members: { create: { userId, role: 'OWNER' } },
    },
  });

  const cafe = await prisma.crop.create({
    data: {
      name: 'Café Caturra Lote 1', type: 'CAFE', farmId: farm.id, hectares: 5.0,
      plantingDate: new Date('2023-03-01'), expectedHarvestDate: daysFromToday(65), status: 'ACTIVE',
    },
  });
  const platano = await prisma.crop.create({
    data: {
      name: 'Plátano Dominico Hartón', type: 'PLATANO', farmId: farm.id, hectares: 2.0,
      plantingDate: new Date('2024-01-15'), status: 'ACTIVE',
    },
  });

  const carlos = await prisma.worker.create({ data: { name: 'Carlos Pérez', phone: '3001234567', idNumber: '1122334455', farmId: farm.id } });
  const maria = await prisma.worker.create({ data: { name: 'María Gómez', phone: '3007654321', idNumber: '1122334466', farmId: farm.id } });
  const jose = await prisma.worker.create({ data: { name: 'José Ramírez', phone: '3009988776', idNumber: '1122334477', farmId: farm.id, active: false } });

  const actSiembra = await prisma.activity.create({ data: { name: 'Siembra lote nuevo', category: 'SIEMBRA', cropId: platano.id, startDate: monthsAgoRef(5), endDate: monthsAgoRef(5, 18), status: 'COMPLETED', description: 'Siembra de colinos de plátano' } });
  const actFertilizacion1 = await prisma.activity.create({ data: { name: 'Fertilización primera pasada', category: 'FERTILIZACION', cropId: cafe.id, startDate: monthsAgoRef(4), endDate: monthsAgoRef(4, 18), status: 'COMPLETED', description: 'Aplicación de fertilizante 10-30-10' } });
  const actFumigacion1 = await prisma.activity.create({ data: { name: 'Fumigación broca', category: 'FUMIGACION', cropId: cafe.id, startDate: monthsAgoRef(3), endDate: monthsAgoRef(3, 16), status: 'COMPLETED', description: 'Control de broca del café' } });
  const actPoda = await prisma.activity.create({ data: { name: 'Poda de renovación', category: 'PODA', cropId: cafe.id, startDate: monthsAgoRef(1), endDate: monthsAgoRef(1, 20), status: 'COMPLETED', description: 'Poda selectiva zócalo' } });
  const actRiego = await prisma.activity.create({ data: { name: 'Riego por goteo', category: 'RIEGO', cropId: platano.id, startDate: daysFromToday(-2), status: 'IN_PROGRESS', description: 'Riego de apoyo en época seca' } });
  await prisma.activity.create({ data: { name: 'Fertilización segunda pasada', category: 'FERTILIZACION', cropId: cafe.id, startDate: daysFromToday(3), status: 'IN_PROGRESS', description: 'Aplicación de fertilizante foliar' } });
  await prisma.activity.create({ data: { name: 'Fumigación preventiva roya', category: 'FUMIGACION', cropId: cafe.id, startDate: daysFromToday(2), status: 'IN_PROGRESS', description: 'Control preventivo de roya' } });
  const actCosecha = await prisma.activity.create({ data: { name: 'Cosecha mitaca', category: 'COSECHA', cropId: cafe.id, startDate: daysFromToday(1), status: 'IN_PROGRESS', description: 'Recolección café maduro' } });

  await prisma.jornal.createMany({
    data: [
      { workerId: carlos.id, activityId: actSiembra.id, date: monthsAgoRef(5, 16), days: 3, dailyValue: 65000, notes: 'Sector norte' },
      { workerId: maria.id, activityId: actSiembra.id, date: monthsAgoRef(5, 17), days: 3, dailyValue: 65000, notes: 'Sector norte' },
      { workerId: carlos.id, activityId: actFertilizacion1.id, date: monthsAgoRef(4, 16), days: 2, dailyValue: 65000, notes: 'Aplicación manual' },
      { workerId: jose.id, activityId: actFumigacion1.id, date: monthsAgoRef(3, 14), days: 1.5, dailyValue: 70000, notes: 'Con equipo de fumigación' },
      { workerId: carlos.id, activityId: actPoda.id, date: monthsAgoRef(1, 18), days: 4, dailyValue: 65000, notes: 'Poda zócalo lote 1' },
      { workerId: maria.id, activityId: actPoda.id, date: monthsAgoRef(1, 19), days: 4, dailyValue: 65000, notes: 'Poda zócalo lote 1' },
      { workerId: maria.id, activityId: actRiego.id, date: daysFromToday(-2), days: 1, dailyValue: 65000, notes: 'Instalación de mangueras' },
      { workerId: carlos.id, activityId: actCosecha.id, date: daysFromToday(0), days: 1, dailyValue: 70000, notes: 'Recolección inicial' },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { farmId: farm.id, cropId: cafe.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 4500000, date: monthsAgoRef(5, 20), description: 'Venta cosecha café pergamino 300kg' },
      { farmId: farm.id, type: 'EXPENSE', category: 'INSUMOS', amount: 280000, date: monthsAgoRef(4, 10), description: 'Fertilizante triple 15' },
      { farmId: farm.id, type: 'EXPENSE', category: 'JORNALES', amount: 130000, date: monthsAgoRef(4, 16), description: 'Jornales fertilización' },
      { farmId: farm.id, type: 'EXPENSE', category: 'INSUMOS', amount: 195000, date: monthsAgoRef(3, 12), description: 'Fungicida para broca' },
      { farmId: farm.id, type: 'EXPENSE', category: 'JORNALES', amount: 105000, date: monthsAgoRef(3, 14), description: 'Jornales fumigación' },
      { farmId: farm.id, cropId: cafe.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 3200000, date: monthsAgoRef(2, 20), description: 'Venta mitaca café' },
      { farmId: farm.id, type: 'EXPENSE', category: 'SERVICIOS_EXTERNOS', amount: 150000, date: monthsAgoRef(2, 5), description: 'Análisis de suelos' },
      { farmId: farm.id, type: 'EXPENSE', category: 'MAQUINARIA', amount: 420000, date: monthsAgoRef(1, 8), description: 'Mantenimiento guadaña' },
      { farmId: farm.id, type: 'EXPENSE', category: 'JORNALES', amount: 520000, date: monthsAgoRef(1, 19), description: 'Jornales poda' },
      { farmId: farm.id, type: 'EXPENSE', category: 'TRANSPORTE', amount: 90000, date: monthsAgoRef(0, 5), description: 'Flete insumos' },
      { farmId: farm.id, cropId: platano.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 850000, date: monthsAgoRef(0, 10), description: 'Venta plátano semana 1' },
      { farmId: farm.id, type: 'EXPENSE', category: 'INSUMOS', amount: 110000, date: daysFromToday(-3), description: 'Fertilizante foliar' },
    ],
  });

  await prisma.harvestProjection.createMany({
    data: [
      { cropId: cafe.id, projectedDate: monthsAgoRef(5, 20), projectedQuantity: 320, actualQuantity: 300, unit: 'kg', unitPrice: 15000, notes: 'Cosecha traviesa' },
      { cropId: cafe.id, projectedDate: monthsAgoRef(2, 20), projectedQuantity: 350, actualQuantity: 380, unit: 'kg', unitPrice: 16000, notes: 'Cosecha mitaca anterior' },
      { cropId: cafe.id, projectedDate: daysFromToday(65), projectedQuantity: 500, unit: 'kg', unitPrice: 16500, notes: 'Cosecha principal, estimada' },
    ],
  });

  const hato = await prisma.livestockBatch.create({
    data: { name: 'Hato Lechero', species: 'BOVINO', purpose: 'LECHE', farmId: farm.id, quantity: 4, acquisitionDate: new Date('2024-02-01') },
  });
  const vaca1 = await prisma.animal.create({ data: { batchId: hato.id, tag: 'V-001', sex: 'HEMBRA', breed: 'Holstein', birthDate: new Date('2022-05-10') } });
  const vaca2 = await prisma.animal.create({ data: { batchId: hato.id, tag: 'V-002', sex: 'HEMBRA', breed: 'Normando', birthDate: new Date('2021-11-20') } });

  await prisma.weightRecord.createMany({
    data: [
      { animalId: vaca1.id, date: monthsAgoRef(3, 1), weightKg: 480 },
      { animalId: vaca1.id, date: monthsAgoRef(1, 1), weightKg: 495 },
      { animalId: vaca1.id, date: daysFromToday(-5), weightKg: 505 },
      { animalId: vaca2.id, date: monthsAgoRef(3, 1), weightKg: 460 },
      { animalId: vaca2.id, date: monthsAgoRef(1, 1), weightKg: 470 },
      { animalId: vaca2.id, date: daysFromToday(-5), weightKg: 478 },
    ],
  });
  await prisma.healthRecord.create({ data: { batchId: hato.id, type: 'VACUNA', date: monthsAgoRef(2, 5), product: 'Fiebre aftosa', cost: 90000, nextDueDate: monthsAgoRef(-4, 5) } });
  await prisma.reproductionRecord.create({ data: { animalId: vaca1.id, type: 'GESTACION_CONFIRMADA', date: monthsAgoRef(1, 10), expectedDate: daysFromToday(180) } });

  await prisma.productionRecord.createMany({
    data: [
      { batchId: hato.id, date: monthsAgoRef(1, 1), productType: 'LECHE', quantity: 48, unit: 'litros' },
      { batchId: hato.id, date: monthsAgoRef(0, 8), productType: 'LECHE', quantity: 50, unit: 'litros' },
      { batchId: hato.id, date: monthsAgoRef(0, 15), productType: 'LECHE', quantity: 52, unit: 'litros' },
      { batchId: hato.id, date: monthsAgoRef(0, 22), productType: 'LECHE', quantity: 53, unit: 'litros' },
      { batchId: hato.id, date: daysFromToday(-3), productType: 'LECHE', quantity: 55, unit: 'litros' },
    ],
  });

  const actManejoHato = await prisma.activity.create({ data: { name: 'Manejo sanitario del hato', category: 'MANEJO_ANIMAL', livestockBatchId: hato.id, startDate: monthsAgoRef(2, 5), endDate: monthsAgoRef(2, 5), status: 'COMPLETED', description: 'Vacunación y revisión general' } });
  await prisma.jornal.create({ data: { workerId: carlos.id, activityId: actManejoHato.id, date: monthsAgoRef(2, 5), days: 1, dailyValue: 65000, notes: 'Apoyo en vacunación' } });

  await prisma.transaction.createMany({
    data: [
      { farmId: farm.id, livestockBatchId: hato.id, type: 'EXPENSE', category: 'INSUMOS', amount: 90000, date: monthsAgoRef(2, 5), description: 'Vacuna fiebre aftosa' },
      { farmId: farm.id, livestockBatchId: hato.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 780000, date: daysFromToday(-3), description: 'Venta de leche del mes' },
    ],
  });

  return farm;
};
