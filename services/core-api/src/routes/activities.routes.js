const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/activities.controller');
const validate = require('../middleware/validate');
const jornalesRoutes = require('./jornales.routes');

const CATEGORIES = ['SIEMBRA', 'FERTILIZACION', 'FUMIGACION', 'PODA', 'COSECHA', 'MANTENIMIENTO', 'RIEGO', 'OTRO'];
const STATUSES = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const createValidators = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  body('category').isIn(CATEGORIES).withMessage(`category debe ser uno de: ${CATEGORIES.join(', ')}`),
  body('startDate').isISO8601().withMessage('startDate es requerido y debe ser una fecha válida'),
  body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('endDate inválida'),
];

const updateValidators = [
  body('name').optional().trim().isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  body('category').optional().isIn(CATEGORIES).withMessage(`category debe ser uno de: ${CATEGORIES.join(', ')}`),
  body('status').optional().isIn(STATUSES).withMessage(`status debe ser uno de: ${STATUSES.join(', ')}`),
  body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('startDate inválida'),
  body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('endDate inválida'),
];

router.use('/:activityId/jornales', jornalesRoutes);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
