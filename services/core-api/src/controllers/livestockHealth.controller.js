const { createBatchRecordController } = require('../utils/nestedRecordController');

module.exports = createBatchRecordController({
  model: 'healthRecord',
  fields: [
    { name: 'animalId', type: 'int' }, // opcional: null = evento de todo el lote
    { name: 'type', type: 'string' },
    { name: 'date', type: 'date' },
    { name: 'product', type: 'string' },
    { name: 'cost', type: 'number' },
    { name: 'nextDueDate', type: 'date' },
    { name: 'notes', type: 'string' },
  ],
  include: { animal: { select: { id: true, tag: true } } },
});
