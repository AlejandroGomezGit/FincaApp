const { createAnimalRecordController } = require('../utils/nestedRecordController');

module.exports = createAnimalRecordController({
  model: 'weightRecord',
  fields: [
    { name: 'date', type: 'date' },
    { name: 'weightKg', type: 'number' },
    { name: 'notes', type: 'string' },
  ],
  include: undefined,
});
