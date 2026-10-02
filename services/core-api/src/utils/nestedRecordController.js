// Fábrica de controllers CRUD para los "registros" de ganado (peso, salud,
// reproducción, producción, mortalidad): mismo esqueleto en los 5 — verificar
// dueño del padre, listar/crear/actualizar/borrar con chequeo de ownership.
// Solo cambian el modelo de Prisma, los campos propios y el tipo de padre
// (lote vs. animal individual). Evita repetir ese esqueleto 5 veces.
const prisma = require('../config/prisma');
const { farmAccessWhere } = require('./farmAccess');

function coerce(value, type) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return type === 'string' ? value : null;
  switch (type) {
    case 'number': return Number(value);
    case 'int': return parseInt(value, 10);
    case 'date': return new Date(value);
    default: return value;
  }
}

function buildData(body, fields) {
  const data = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f.name)) {
      data[f.name] = coerce(body[f.name], f.type);
    }
  }
  return data;
}

// Registros que cuelgan directamente de un LivestockBatch (ej. vacunar todo
// el lote, producción diaria de huevos, baja de N aves) — ownership vía
// finca → lote.
exports.createBatchRecordController = ({ model, fields, include }) => {
  const batchOwned = (batchId, userId) =>
    prisma.livestockBatch.findFirst({ where: { id: Number(batchId), farm: farmAccessWhere(userId) } });

  return {
    list: async (req, res, next) => {
      try {
        const { batchId } = req.params;
        if (!await batchOwned(batchId, req.userId)) return res.status(404).json({ message: 'Lote no encontrado' });
        const records = await prisma[model].findMany({
          where: { batchId: Number(batchId) },
          include,
          orderBy: { date: 'desc' },
        });
        res.json(records);
      } catch (err) { next(err); }
    },
    create: async (req, res, next) => {
      try {
        const { batchId } = req.params;
        if (!await batchOwned(batchId, req.userId)) return res.status(404).json({ message: 'Lote no encontrado' });
        const record = await prisma[model].create({
          data: { ...buildData(req.body, fields), batchId: Number(batchId) },
          include,
        });
        res.status(201).json(record);
      } catch (err) { next(err); }
    },
    update: async (req, res, next) => {
      try {
        const existing = await prisma[model].findFirst({
          where: { id: Number(req.params.id), batch: farmAccessWhere(req.userId) },
        });
        if (!existing) return res.status(404).json({ message: 'Registro no encontrado' });
        const record = await prisma[model].update({
          where: { id: Number(req.params.id) },
          data: buildData(req.body, fields),
          include,
        });
        res.json(record);
      } catch (err) { next(err); }
    },
    remove: async (req, res, next) => {
      try {
        const existing = await prisma[model].findFirst({
          where: { id: Number(req.params.id), batch: farmAccessWhere(req.userId) },
        });
        if (!existing) return res.status(404).json({ message: 'Registro no encontrado' });
        await prisma[model].delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
      } catch (err) { next(err); }
    },
  };
};

// Registros que cuelgan de un Animal individual (peso, reproducción) —
// ownership vía finca → lote → animal.
exports.createAnimalRecordController = ({ model, fields, include }) => {
  const animalOwned = (animalId, userId) =>
    prisma.animal.findFirst({ where: { id: Number(animalId), batch: farmAccessWhere(userId) } });

  return {
    list: async (req, res, next) => {
      try {
        const { animalId } = req.params;
        if (!await animalOwned(animalId, req.userId)) return res.status(404).json({ message: 'Animal no encontrado' });
        const records = await prisma[model].findMany({
          where: { animalId: Number(animalId) },
          include,
          orderBy: { date: 'desc' },
        });
        res.json(records);
      } catch (err) { next(err); }
    },
    create: async (req, res, next) => {
      try {
        const { animalId } = req.params;
        if (!await animalOwned(animalId, req.userId)) return res.status(404).json({ message: 'Animal no encontrado' });
        const record = await prisma[model].create({
          data: { ...buildData(req.body, fields), animalId: Number(animalId) },
          include,
        });
        res.status(201).json(record);
      } catch (err) { next(err); }
    },
    update: async (req, res, next) => {
      try {
        const existing = await prisma[model].findFirst({
          where: { id: Number(req.params.id), animal: { batch: farmAccessWhere(req.userId) } },
        });
        if (!existing) return res.status(404).json({ message: 'Registro no encontrado' });
        const record = await prisma[model].update({
          where: { id: Number(req.params.id) },
          data: buildData(req.body, fields),
          include,
        });
        res.json(record);
      } catch (err) { next(err); }
    },
    remove: async (req, res, next) => {
      try {
        const existing = await prisma[model].findFirst({
          where: { id: Number(req.params.id), animal: { batch: farmAccessWhere(req.userId) } },
        });
        if (!existing) return res.status(404).json({ message: 'Registro no encontrado' });
        await prisma[model].delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
      } catch (err) { next(err); }
    },
  };
};
