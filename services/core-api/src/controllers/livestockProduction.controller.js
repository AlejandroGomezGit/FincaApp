const { createBatchRecordController } = require('../utils/nestedRecordController');

module.exports = createBatchRecordController({
  model: 'productionRecord',
  fields: [
    { name: 'date', type: 'date' },
    { name: 'productType', type: 'string' },
    { name: 'quantity', type: 'number' },
    { name: 'unit', type: 'string' },
    { name: 'notes', type: 'string' },
  ],
  include: undefined,
});
