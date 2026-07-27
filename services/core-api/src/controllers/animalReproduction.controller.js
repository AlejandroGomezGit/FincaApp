const { createAnimalRecordController } = require('../utils/nestedRecordController');

module.exports = createAnimalRecordController({
  model: 'reproductionRecord',
  fields: [
    { name: 'type', type: 'string' },
    { name: 'date', type: 'date' },
    { name: 'expectedDate', type: 'date' },
    { name: 'offspringCount', type: 'int' },
    { name: 'notes', type: 'string' },
  ],
  include: undefined,
});
