const { PrismaClient } = require('@prisma/client');
// Excepción deliberada: este script de fixtures crea el User admin de prueba
// directamente por Prisma (no vía la API de auth-service) porque es tooling
// de desarrollo de un solo uso, no código de runtime — no tiene sentido
// levantar una llamada HTTP a otro servicio solo para sembrar datos locales.
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// "Hoy" fijo de referencia para que las fechas relativas (jornales recientes,
// actividades próximas, etc.) tengan sentido sin importar cuándo se corra
// este script.
const TODAY = new Date('2026-07-27');
const daysFromToday = (n) => new Date(TODAY.getTime() + n * 86400000);
const monthsAgo = (n, day = 15) => new Date(TODAY.getFullYear(), TODAY.getMonth() - n, day);

async function main() {
  const hashed = await bcrypt.hash('admin123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@finca.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@finca.com', password: hashed },
  });

  // Reutilizable: si ya corriste el seed antes, borra las fincas previas del
  // usuario demo (cascada a cultivos/actividades/jornales/transacciones) y
  // vuelve a crear todo limpio, en vez de duplicar datos en cada corrida.
  await prisma.farm.deleteMany({ where: { userId: user.id } });

  // ─────────────────────────────────────────────────────────────
  // Finca 1: La Esperanza — la finca "principal", con datos ricos
  // en todos los módulos para poder explorar cada pantalla.
  // ─────────────────────────────────────────────────────────────
  const finca1 = await prisma.farm.create({
    data: {
      name: 'Finca La Esperanza',
      location: 'Huila, Colombia',
      description: 'Finca cafetera principal, con café y plátano intercalado',
      hectares: 12.5,
      userId: user.id,
    },
  });

  const cafe = await prisma.crop.create({
    data: {
      name: 'Café Caturra Lote 1',
      type: 'CAFE',
      farmId: finca1.id,
      hectares: 5.0,
      plantingDate: new Date('2023-03-01'),
      expectedHarvestDate: daysFromToday(65),
      status: 'ACTIVE',
    },
  });

  const platano = await prisma.crop.create({
    data: {
      name: 'Plátano Dominico Hartón',
      type: 'PLATANO',
      farmId: finca1.id,
      hectares: 2.0,
      plantingDate: new Date('2024-01-15'),
      status: 'ACTIVE',
    },
  });

  const carlos = await prisma.worker.create({
    data: { name: 'Carlos Pérez', phone: '3001234567', idNumber: '1122334455', farmId: finca1.id },
  });
  const maria = await prisma.worker.create({
    data: { name: 'María Gómez', phone: '3007654321', idNumber: '1122334466', farmId: finca1.id },
  });
  const jose = await prisma.worker.create({
    data: { name: 'José Ramírez', phone: '3009988776', idNumber: '1122334477', farmId: finca1.id, active: false },
  });

  // Actividades: una mezcla de completadas (historial), en curso y próximas,
  // repartidas en varias categorías — para que el módulo de Actividades, el
  // costo por jornales del Dashboard y las reglas de clima tengan algo real
  // con qué trabajar.
  const actSiembra = await prisma.activity.create({
    data: { name: 'Siembra lote nuevo', category: 'SIEMBRA', cropId: platano.id, startDate: monthsAgo(5), endDate: monthsAgo(5, 18), status: 'COMPLETED', description: 'Siembra de colinos de plátano' },
  });
  const actFertilizacion1 = await prisma.activity.create({
    data: { name: 'Fertilización primera pasada', category: 'FERTILIZACION', cropId: cafe.id, startDate: monthsAgo(4), endDate: monthsAgo(4, 18), status: 'COMPLETED', description: 'Aplicación de fertilizante 10-30-10' },
  });
  const actFumigacion1 = await prisma.activity.create({
    data: { name: 'Fumigación broca', category: 'FUMIGACION', cropId: cafe.id, startDate: monthsAgo(3), endDate: monthsAgo(3, 16), status: 'COMPLETED', description: 'Control de broca del café' },
  });
  const actPoda = await prisma.activity.create({
    data: { name: 'Poda de renovación', category: 'PODA', cropId: cafe.id, startDate: monthsAgo(1), endDate: monthsAgo(1, 20), status: 'COMPLETED', description: 'Poda selectiva zócalo' },
  });
  const actRiego = await prisma.activity.create({
    data: { name: 'Riego por goteo', category: 'RIEGO', cropId: platano.id, startDate: daysFromToday(-2), status: 'IN_PROGRESS', description: 'Riego de apoyo en época seca' },
  });
  const actFertilizacion2 = await prisma.activity.create({
    data: { name: 'Fertilización segunda pasada', category: 'FERTILIZACION', cropId: cafe.id, startDate: daysFromToday(3), status: 'IN_PROGRESS', description: 'Aplicación de fertilizante foliar' },
  });
  const actFumigacion2 = await prisma.activity.create({
    data: { name: 'Fumigación preventiva roya', category: 'FUMIGACION', cropId: cafe.id, startDate: daysFromToday(2), status: 'IN_PROGRESS', description: 'Control preventivo de roya' },
  });
  const actCosecha = await prisma.activity.create({
    data: { name: 'Cosecha mitaca', category: 'COSECHA', cropId: cafe.id, startDate: daysFromToday(1), status: 'IN_PROGRESS', description: 'Recolección café maduro' },
  });

  const jornalesData = [
    { workerId: carlos.id, activityId: actSiembra.id, date: monthsAgo(5, 16), days: 3, dailyValue: 65000, notes: 'Sector norte' },
    { workerId: maria.id, activityId: actSiembra.id, date: monthsAgo(5, 17), days: 3, dailyValue: 65000, notes: 'Sector norte' },
    { workerId: carlos.id, activityId: actFertilizacion1.id, date: monthsAgo(4, 16), days: 2, dailyValue: 65000, notes: 'Aplicación manual' },
    { workerId: jose.id, activityId: actFumigacion1.id, date: monthsAgo(3, 14), days: 1.5, dailyValue: 70000, notes: 'Con equipo de fumigación' },
    { workerId: carlos.id, activityId: actPoda.id, date: monthsAgo(1, 18), days: 4, dailyValue: 65000, notes: 'Poda zócalo lote 1' },
    { workerId: maria.id, activityId: actPoda.id, date: monthsAgo(1, 19), days: 4, dailyValue: 65000, notes: 'Poda zócalo lote 1' },
    { workerId: maria.id, activityId: actRiego.id, date: daysFromToday(-2), days: 1, dailyValue: 65000, notes: 'Instalación de mangueras' },
    { workerId: carlos.id, activityId: actCosecha.id, date: daysFromToday(0), days: 1, dailyValue: 70000, notes: 'Recolección inicial' },
  ];
  await prisma.jornal.createMany({ data: jornalesData });

  // Transacciones repartidas en 6 meses (para que la proyección financiera
  // de Analítica tenga suficiente historial y muestre una tendencia real en
  // vez de "datos insuficientes").
  await prisma.transaction.createMany({
    data: [
      { farmId: finca1.id, cropId: cafe.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 4500000, date: monthsAgo(5, 20), description: 'Venta cosecha café pergamino 300kg' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'INSUMOS', amount: 280000, date: monthsAgo(4, 10), description: 'Fertilizante triple 15' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'JORNALES', amount: 130000, date: monthsAgo(4, 16), description: 'Jornales fertilización' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'INSUMOS', amount: 195000, date: monthsAgo(3, 12), description: 'Fungicida para broca' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'JORNALES', amount: 105000, date: monthsAgo(3, 14), description: 'Jornales fumigación' },
      { farmId: finca1.id, cropId: cafe.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 3200000, date: monthsAgo(2, 20), description: 'Venta mitaca café' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'SERVICIOS_EXTERNOS', amount: 150000, date: monthsAgo(2, 5), description: 'Análisis de suelos' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'MAQUINARIA', amount: 420000, date: monthsAgo(1, 8), description: 'Mantenimiento guadaña' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'JORNALES', amount: 520000, date: monthsAgo(1, 19), description: 'Jornales poda' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'TRANSPORTE', amount: 90000, date: monthsAgo(0, 5), description: 'Flete insumos' },
      { farmId: finca1.id, cropId: platano.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 850000, date: monthsAgo(0, 10), description: 'Venta plátano semana 1' },
      { farmId: finca1.id, type: 'EXPENSE', category: 'INSUMOS', amount: 110000, date: daysFromToday(-3), description: 'Fertilizante foliar' },
    ],
  });

  // Proyecciones de cosecha: dos con cantidad real (para que el módulo de
  // Analítica pueda calcular tendencia de rendimiento) y una futura sin
  // cantidad real todavía (aparece en "Próximas Cosechas" del Dashboard).
  await prisma.harvestProjection.createMany({
    data: [
      { cropId: cafe.id, projectedDate: monthsAgo(5, 20), projectedQuantity: 320, actualQuantity: 300, unit: 'kg', unitPrice: 15000, notes: 'Cosecha traviesa' },
      { cropId: cafe.id, projectedDate: monthsAgo(2, 20), projectedQuantity: 350, actualQuantity: 380, unit: 'kg', unitPrice: 16000, notes: 'Cosecha mitaca anterior' },
      { cropId: cafe.id, projectedDate: daysFromToday(65), projectedQuantity: 500, unit: 'kg', unitPrice: 16500, notes: 'Cosecha principal, estimada' },
    ],
  });

  // ─────────────────────────────────────────────────────────────
  // Finca 2: El Progreso — segunda finca, más pequeña y con menor
  // balance, para ver el ranking/comparación entre fincas en acción.
  // ─────────────────────────────────────────────────────────────
  const finca2 = await prisma.farm.create({
    data: {
      name: 'Finca El Progreso',
      location: 'Quindío, Colombia',
      description: 'Finca pequeña de aguacate en desarrollo',
      hectares: 4.0,
      userId: user.id,
    },
  });

  const aguacate = await prisma.crop.create({
    data: {
      name: 'Aguacate Hass Lote A',
      type: 'AGUACATE',
      farmId: finca2.id,
      hectares: 3.0,
      plantingDate: new Date('2024-06-01'),
      status: 'ACTIVE',
    },
  });

  const pedro = await prisma.worker.create({
    data: { name: 'Pedro Salazar', phone: '3012223344', idNumber: '9988776655', farmId: finca2.id },
  });

  const actFertAguacate = await prisma.activity.create({
    data: { name: 'Fertilización aguacate', category: 'FERTILIZACION', cropId: aguacate.id, startDate: monthsAgo(2), endDate: monthsAgo(2, 14), status: 'COMPLETED', description: 'Fertilización de crecimiento' },
  });
  await prisma.jornal.create({
    data: { workerId: pedro.id, activityId: actFertAguacate.id, date: monthsAgo(2, 12), days: 2, dailyValue: 60000, notes: 'Aplicación de abono orgánico' },
  });

  await prisma.transaction.createMany({
    data: [
      { farmId: finca2.id, type: 'EXPENSE', category: 'INSUMOS', amount: 320000, date: monthsAgo(2, 10), description: 'Abono orgánico y cal' },
      { farmId: finca2.id, type: 'EXPENSE', category: 'JORNALES', amount: 120000, date: monthsAgo(2, 12), description: 'Jornales fertilización' },
      { farmId: finca2.id, type: 'EXPENSE', category: 'MAQUINARIA', amount: 180000, date: monthsAgo(1, 5), description: 'Alquiler de guadañadora' },
      { farmId: finca2.id, type: 'EXPENSE', category: 'SERVICIOS_EXTERNOS', amount: 90000, date: monthsAgo(0, 8), description: 'Asesoría técnica' },
    ],
  });

  // ─────────────────────────────────────────────────────────────
  // Ganado: hato lechero en Finca 1 (con animales individuales — así
  // se ve el seguimiento por cabeza) y gallinas ponedoras en Finca 2
  // (sin animales individuales — todo a nivel de lote, como se maneja
  // de verdad una parvada). También deja datos pensados para que las
  // alertas tempranas disparen de verdad al abrir la app por primera vez.
  // ─────────────────────────────────────────────────────────────
  const hato = await prisma.livestockBatch.create({
    data: {
      name: 'Hato Lechero', species: 'BOVINO', purpose: 'LECHE', farmId: finca1.id,
      quantity: 4, acquisitionDate: new Date('2024-02-01'),
    },
  });

  const vaca1 = await prisma.animal.create({
    data: { batchId: hato.id, tag: 'V-001', sex: 'HEMBRA', breed: 'Holstein', birthDate: new Date('2022-05-10') },
  });
  const vaca2 = await prisma.animal.create({
    data: { batchId: hato.id, tag: 'V-002', sex: 'HEMBRA', breed: 'Normando', birthDate: new Date('2021-11-20') },
  });

  await prisma.weightRecord.createMany({
    data: [
      { animalId: vaca1.id, date: monthsAgo(3, 1), weightKg: 480 },
      { animalId: vaca1.id, date: monthsAgo(1, 1), weightKg: 495 },
      { animalId: vaca1.id, date: daysFromToday(-5), weightKg: 505 },
      { animalId: vaca2.id, date: monthsAgo(3, 1), weightKg: 460 },
      { animalId: vaca2.id, date: monthsAgo(1, 1), weightKg: 470 },
      { animalId: vaca2.id, date: daysFromToday(-5), weightKg: 478 },
    ],
  });

  await prisma.healthRecord.create({
    data: { batchId: hato.id, type: 'VACUNA', date: monthsAgo(2, 5), product: 'Fiebre aftosa', cost: 90000, nextDueDate: monthsAgo(-4, 5) },
  });
  await prisma.reproductionRecord.create({
    data: { animalId: vaca1.id, type: 'GESTACION_CONFIRMADA', date: monthsAgo(1, 10), expectedDate: daysFromToday(180) },
  });

  // Producción de leche estable/creciente — a propósito NO dispara la alerta
  // de "producción cayendo", para que quede claro que el sistema no alerta
  // por alertar.
  await prisma.productionRecord.createMany({
    data: [
      { batchId: hato.id, date: monthsAgo(1, 1), productType: 'LECHE', quantity: 48, unit: 'litros' },
      { batchId: hato.id, date: monthsAgo(0, 8), productType: 'LECHE', quantity: 50, unit: 'litros' },
      { batchId: hato.id, date: monthsAgo(0, 15), productType: 'LECHE', quantity: 52, unit: 'litros' },
      { batchId: hato.id, date: monthsAgo(0, 22), productType: 'LECHE', quantity: 53, unit: 'litros' },
      { batchId: hato.id, date: daysFromToday(-3), productType: 'LECHE', quantity: 55, unit: 'litros' },
    ],
  });

  const actManejoHato = await prisma.activity.create({
    data: { name: 'Manejo sanitario del hato', category: 'MANEJO_ANIMAL', livestockBatchId: hato.id, startDate: monthsAgo(2, 5), endDate: monthsAgo(2, 5), status: 'COMPLETED', description: 'Vacunación y revisión general' },
  });
  await prisma.jornal.create({
    data: { workerId: carlos.id, activityId: actManejoHato.id, date: monthsAgo(2, 5), days: 1, dailyValue: 65000, notes: 'Apoyo en vacunación' },
  });

  await prisma.transaction.createMany({
    data: [
      { farmId: finca1.id, livestockBatchId: hato.id, type: 'EXPENSE', category: 'INSUMOS', amount: 90000, date: monthsAgo(2, 5), description: 'Vacuna fiebre aftosa' },
      { farmId: finca1.id, livestockBatchId: hato.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 780000, date: daysFromToday(-3), description: 'Venta de leche del mes' },
    ],
  });

  // Gallinas ponedoras en Finca 2 — sin animales individuales (se maneja
  // todo a nivel de lote, como en una parvada real).
  const gallinas = await prisma.livestockBatch.create({
    data: {
      name: 'Gallinas Ponedoras', species: 'AVES', purpose: 'HUEVOS', farmId: finca2.id,
      quantity: 150, acquisitionDate: new Date('2025-09-01'),
    },
  });

  await prisma.healthRecord.create({
    data: { batchId: gallinas.id, type: 'VACUNA', date: monthsAgo(2, 3), product: 'Newcastle', cost: 60000 },
  });

  // Mortalidad: historial normal en los dos meses anteriores, y un pico
  // este mes — a propósito, para que la alerta de "mortalidad alta" tenga
  // algo real que mostrar apenas se abra la app.
  await prisma.mortalityRecord.createMany({
    data: [
      { batchId: gallinas.id, date: monthsAgo(2, 10), quantity: 2, cause: 'Causas naturales' },
      { batchId: gallinas.id, date: monthsAgo(1, 12), quantity: 3, cause: 'Causas naturales' },
      { batchId: gallinas.id, date: daysFromToday(-4), quantity: 12, cause: 'Posible enfermedad respiratoria' },
    ],
  });

  // Producción de huevos con tendencia a la baja — dispara la alerta de
  // "producción cayendo" (coincide con el pico de mortalidad de arriba,
  // una historia coherente: algo está afectando al lote).
  await prisma.productionRecord.createMany({
    data: [
      { batchId: gallinas.id, date: monthsAgo(1, 1), productType: 'HUEVOS', quantity: 140, unit: 'unidades' },
      { batchId: gallinas.id, date: monthsAgo(0, 8), productType: 'HUEVOS', quantity: 135, unit: 'unidades' },
      { batchId: gallinas.id, date: monthsAgo(0, 15), productType: 'HUEVOS', quantity: 128, unit: 'unidades' },
      { batchId: gallinas.id, date: monthsAgo(0, 22), productType: 'HUEVOS', quantity: 118, unit: 'unidades' },
      { batchId: gallinas.id, date: daysFromToday(-3), productType: 'HUEVOS', quantity: 105, unit: 'unidades' },
    ],
  });

  // Actividades de alimentación: dos normales (1 jornal) para tener
  // historial, y una reciente de 5 jornales — bien por encima del
  // promedio, a propósito, para demostrar la alerta de "jornales por
  // encima de lo normal" apenas se entre a la app.
  const actAliment1 = await prisma.activity.create({
    data: { name: 'Alimentación semanal', category: 'ALIMENTACION', livestockBatchId: gallinas.id, startDate: monthsAgo(2, 8), endDate: monthsAgo(2, 8), status: 'COMPLETED' },
  });
  const actAliment2 = await prisma.activity.create({
    data: { name: 'Alimentación semanal', category: 'ALIMENTACION', livestockBatchId: gallinas.id, startDate: monthsAgo(1, 8), endDate: monthsAgo(1, 8), status: 'COMPLETED' },
  });
  const actAlimentPico = await prisma.activity.create({
    data: { name: 'Refuerzo alimenticio por baja producción', category: 'ALIMENTACION', livestockBatchId: gallinas.id, startDate: daysFromToday(-4), endDate: daysFromToday(-3), status: 'COMPLETED', description: 'Ración extra tras detectar la caída de postura' },
  });
  await prisma.jornal.createMany({
    data: [
      { workerId: pedro.id, activityId: actAliment1.id, date: monthsAgo(2, 8), days: 1, dailyValue: 60000 },
      { workerId: pedro.id, activityId: actAliment2.id, date: monthsAgo(1, 8), days: 1, dailyValue: 60000 },
      { workerId: pedro.id, activityId: actAlimentPico.id, date: daysFromToday(-4), days: 5, dailyValue: 60000, notes: 'Jornada extendida por refuerzo nutricional' },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { farmId: finca2.id, livestockBatchId: gallinas.id, type: 'EXPENSE', category: 'INSUMOS', amount: 60000, date: monthsAgo(2, 3), description: 'Vacuna Newcastle' },
      { farmId: finca2.id, livestockBatchId: gallinas.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 210000, date: daysFromToday(-3), description: 'Venta de huevos del mes' },
    ],
  });

  console.log('Seed completado:');
  console.log('  Usuario:  admin@finca.com / admin123');
  console.log(`  Fincas:   "${finca1.name}" (${cafe.name}, ${platano.name}, ${hato.name}) y "${finca2.name}" (${aguacate.name}, ${gallinas.name})`);
  console.log('  Incluye: 4 trabajadores, 15 actividades, 13 jornales, 20 transacciones,');
  console.log('           3 proyecciones de cosecha, 2 animales individuales con peso/salud/reproducción,');
  console.log('           y datos de ganado pensados para que las alertas tempranas disparen de una vez.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
