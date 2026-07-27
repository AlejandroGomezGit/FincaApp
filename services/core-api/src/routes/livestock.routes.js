const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/livestock.controller');
const validate = require('../middleware/validate');
const animalsRoutes = require('./animals.routes');
const activitiesRoutes = require('./activities.routes');
const healthRoutes = require('./livestockHealth.routes');
const productionRoutes = require('./livestockProduction.routes');
const mortalityRoutes = require('./livestockMortality.routes');

const SPECIES = ['BOVINO', 'AVES', 'PORCINO', 'OVINO', 'CAPRINO', 'EQUINO', 'OTRO'];
const PURPOSES = ['LECHE', 'CARNE', 'HUEVOS', 'REPRODUCCION', 'DOBLE_PROPOSITO', 'OTRO'];
const STATUSES = ['ACTIVE', 'INACTIVE'];

const createValidators = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  body('species').isIn(SPECIES).withMessage(`species debe ser uno de: ${SPECIES.join(', ')}`),
  body('purpose').isIn(PURPOSES).withMessage(`purpose debe ser uno de: ${PURPOSES.join(', ')}`),
  body('quantity').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('quantity debe ser un entero positivo'),
];

const updateValidators = [
  body('name').optional().trim().isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  body('species').optional().isIn(SPECIES).withMessage(`species debe ser uno de: ${SPECIES.join(', ')}`),
  body('purpose').optional().isIn(PURPOSES).withMessage(`purpose debe ser uno de: ${PURPOSES.join(', ')}`),
  body('status').optional().isIn(STATUSES).withMessage(`status debe ser uno de: ${STATUSES.join(', ')}`),
  body('quantity').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('quantity debe ser un entero positivo'),
];

router.use('/:batchId/animals', animalsRoutes);
router.use('/:batchId/activities', activitiesRoutes);
router.use('/:batchId/health', healthRoutes);
router.use('/:batchId/production', productionRoutes);
router.use('/:batchId/mortality', mortalityRoutes);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
