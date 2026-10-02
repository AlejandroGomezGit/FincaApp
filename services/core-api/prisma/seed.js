const { PrismaClient } = require('@prisma/client');
// Excepción deliberada: este script de fixtures crea el User admin de prueba
// directamente por Prisma (no vía la API de auth-service) porque es tooling
// de desarrollo de un solo uso, no código de runtime — no tiene sentido
// levantar una llamada HTTP a otro servicio solo para sembrar datos locales.
const bcrypt = require('bcryptjs');
const { createDemoFarm } = require('../src/services/demoData.service');

const prisma = new PrismaClient();

// "Hoy" fijo de referencia para que las fechas relativas (jornales recientes,
// actividades próximas, etc.) tengan sentido sin importar cuándo se corra
// este script, y para que los datos de desarrollo sean reproducibles.
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

  // Finca 1: La Esperanza — misma fábrica que usa el botón "Cargar finca de
  // ejemplo" en el frontend (ver src/services/demoData.service.js), con
  // fecha de referencia fija para reproducibilidad entre corridas del seed.
  const finca1 = await createDemoFarm(user.id, TODAY);
  const cafe = await prisma.crop.findFirstOrThrow({ where: { farmId: finca1.id, type: 'CAFE' } });
  const platano = await prisma.crop.findFirstOrThrow({ where: { farmId: finca1.id, type: 'PLATANO' } });
  const hato = await prisma.livestockBatch.findFirstOrThrow({ where: { farmId: finca1.id, species: 'BOVINO' } });

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
      members: { create: { userId: user.id, role: 'OWNER' } },
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
