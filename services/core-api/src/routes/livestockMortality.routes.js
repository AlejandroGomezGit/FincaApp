const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/livestockMortality.controller');
const validate = require('../middleware/validate');

const createValidators = [
  body('date').isISO8601().withMessage('date es requerido y debe ser una fecha válida'),
  body('quantity').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('quantity debe ser un entero positivo'),
  body('animalId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('animalId inválido'),
];

const updateValidators = [
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('date inválida'),
  body('quantity').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('quantity debe ser un entero positivo'),
];

router.get('/', ctrl.list);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
