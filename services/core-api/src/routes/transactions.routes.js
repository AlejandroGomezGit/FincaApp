const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/transactions.controller');
const validate = require('../middleware/validate');

const TYPES = ['INCOME', 'EXPENSE'];
const CATEGORIES = ['VENTA_COSECHA', 'INSUMOS', 'MAQUINARIA', 'INFRAESTRUCTURA', 'SERVICIOS_EXTERNOS', 'JORNALES', 'TRANSPORTE', 'OTRO'];

const createValidators = [
  body('type').isIn(TYPES).withMessage(`type debe ser uno de: ${TYPES.join(', ')}`),
  body('category').isIn(CATEGORIES).withMessage(`category debe ser uno de: ${CATEGORIES.join(', ')}`),
  body('amount').isFloat({ min: 0.01 }).withMessage('amount debe ser un número positivo'),
  body('date').isISO8601().withMessage('date es requerido y debe ser una fecha válida'),
  body('cropId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('cropId inválido'),
  body('livestockBatchId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('livestockBatchId inválido'),
];

const updateValidators = [
  body('type').optional().isIn(TYPES).withMessage(`type debe ser uno de: ${TYPES.join(', ')}`),
  body('category').optional().isIn(CATEGORIES).withMessage(`category debe ser uno de: ${CATEGORIES.join(', ')}`),
  body('amount').optional({ values: 'falsy' }).isFloat({ min: 0.01 }).withMessage('amount debe ser un número positivo'),
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('date inválida'),
  body('cropId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('cropId inválido'),
  body('livestockBatchId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('livestockBatchId inválido'),
];

router.get('/', ctrl.list);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
