const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/animalWeights.controller');
const validate = require('../middleware/validate');

const createValidators = [
  body('date').isISO8601().withMessage('date es requerido y debe ser una fecha válida'),
  body('weightKg').isFloat({ min: 0 }).withMessage('weightKg debe ser un número positivo'),
];

const updateValidators = [
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('date inválida'),
  body('weightKg').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('weightKg debe ser un número positivo'),
];

router.get('/', ctrl.list);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
