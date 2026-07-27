const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/crops.controller');
const validate = require('../middleware/validate');
const actRoutes = require('./activities.routes');
const projRoutes = require('./projections.routes');

const CROP_TYPES = ['CAFE', 'PLATANO', 'YUCA', 'MAIZ', 'AGUACATE', 'FRIJOL', 'OTRO'];
const CROP_STATUSES = ['ACTIVE', 'HARVESTED', 'INACTIVE'];

const cropValidators = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  body('type').isIn(CROP_TYPES).withMessage(`type debe ser uno de: ${CROP_TYPES.join(', ')}`),
  body('status').optional().isIn(CROP_STATUSES).withMessage(`status debe ser uno de: ${CROP_STATUSES.join(', ')}`),
  body('hectares').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Hectáreas debe ser un número positivo'),
  body('plantingDate').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha de siembra inválida'),
  body('expectedHarvestDate').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha esperada de cosecha inválida'),
];

router.use('/:cropId/activities', actRoutes);
router.use('/:cropId/projections', projRoutes);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', cropValidators, validate, ctrl.create);
router.put('/:id', cropValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
