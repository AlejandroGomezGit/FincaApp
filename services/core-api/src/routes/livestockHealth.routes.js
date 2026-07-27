const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/livestockHealth.controller');
const validate = require('../middleware/validate');

const TYPES = ['VACUNA', 'DESPARASITACION', 'TRATAMIENTO', 'REVISION', 'OTRO'];

const createValidators = [
  body('type').isIn(TYPES).withMessage(`type debe ser uno de: ${TYPES.join(', ')}`),
  body('date').isISO8601().withMessage('date es requerido y debe ser una fecha válida'),
  body('animalId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('animalId inválido'),
  body('cost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('cost debe ser un número positivo'),
  body('nextDueDate').optional({ values: 'falsy' }).isISO8601().withMessage('nextDueDate inválida'),
];

const updateValidators = [
  body('type').optional().isIn(TYPES).withMessage(`type debe ser uno de: ${TYPES.join(', ')}`),
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('date inválida'),
  body('cost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('cost debe ser un número positivo'),
  body('nextDueDate').optional({ values: 'falsy' }).isISO8601().withMessage('nextDueDate inválida'),
];

router.get('/', ctrl.list);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
