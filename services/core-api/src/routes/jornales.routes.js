const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/jornales.controller');
const validate = require('../middleware/validate');

const createValidators = [
  body('workerId').isInt({ min: 1 }).withMessage('workerId es requerido'),
  body('date').isISO8601().withMessage('date es requerido y debe ser una fecha válida'),
  body('days').isFloat({ min: 0.1, max: 31 }).withMessage('days debe ser un número entre 0.1 y 31'),
  body('dailyValue').isFloat({ min: 0 }).withMessage('dailyValue debe ser un número positivo'),
];

const updateValidators = [
  body('workerId').optional().isInt({ min: 1 }).withMessage('workerId inválido'),
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('date inválida'),
  body('days').optional({ values: 'falsy' }).isFloat({ min: 0.1, max: 31 }).withMessage('days debe ser un número entre 0.1 y 31'),
  body('dailyValue').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('dailyValue debe ser un número positivo'),
];

router.get('/', ctrl.list);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
