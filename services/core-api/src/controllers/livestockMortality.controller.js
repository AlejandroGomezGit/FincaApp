const { createBatchRecordController } = require('../utils/nestedRecordController');

module.exports = createBatchRecordController({
  model: 'mortalityRecord',
  fields: [
    { name: 'animalId', type: 'int' }, // opcional: null = baja de lote (ej. aves)
    { name: 'date', type: 'date' },
    { name: 'quantity', type: 'int' },
    { name: 'cause', type: 'string' },
    { name: 'notes', type: 'string' },
  ],
  include: { animal: { select: { id: true, tag: true } } },
});
