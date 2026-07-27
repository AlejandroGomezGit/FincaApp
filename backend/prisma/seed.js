const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@finca.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@finca.com', password: hashed },
  });

  const farm = await prisma.farm.create({
    data: {
      name: 'Finca La Esperanza',
      location: 'Huila, Colombia',
      description: 'Finca cafetera principal',
      hectares: 12.5,
      userId: user.id,
    },
  });

  const crop = await prisma.crop.create({
    data: {
      name: 'Café Caturra Lote 1',
      type: 'CAFE',
      farmId: farm.id,
      hectares: 5.0,
      plantingDate: new Date('2023-03-01'),
      expectedHarvestDate: new Date('2026-10-01'),
    },
  });

  const worker = await prisma.worker.create({
    data: { name: 'Carlos Pérez', phone: '3001234567', idNumber: '1234567890', farmId: farm.id },
  });

  const activity = await prisma.activity.create({
    data: {
      name: 'Fertilización primera pasada',
      category: 'FERTILIZACION',
      cropId: crop.id,
      startDate: new Date('2026-04-01'),
      description: 'Aplicación de fertilizante 10-30-10',
    },
  });

  await prisma.jornal.create({
    data: {
      workerId: worker.id,
      activityId: activity.id,
      date: new Date('2026-04-02'),
      days: 2,
      dailyValue: 65000,
      notes: 'Sector norte',
    },
  });

  await prisma.transaction.createMany({
    data: [
      { farmId: farm.id, cropId: crop.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 4500000, date: new Date('2026-01-15'), description: 'Venta cosecha café pergamino 300kg' },
      { farmId: farm.id, type: 'EXPENSE', category: 'INSUMOS', amount: 280000, date: new Date('2026-02-10'), description: 'Fertilizante triple 15' },
      { farmId: farm.id, type: 'EXPENSE', category: 'JORNALES', amount: 130000, date: new Date('2026-04-02'), description: 'Jornales fertilización' },
      { farmId: farm.id, type: 'INCOME', category: 'VENTA_COSECHA', amount: 3200000, date: new Date('2026-04-20'), description: 'Venta mitaca café' },
      { farmId: farm.id, type: 'EXPENSE', category: 'SERVICIOS_EXTERNOS', amount: 150000, date: new Date('2026-05-05'), description: 'Análisis de suelos' },
    ],
  });

  await prisma.harvestProjection.create({
    data: {
      cropId: crop.id,
      projectedDate: new Date('2026-10-01'),
      projectedQuantity: 500,
      unit: 'kg',
      unitPrice: 16000,
      notes: 'Cosecha principal café caturra',
    },
  });

  console.log('Seed completado. Usuario: admin@finca.com / admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
