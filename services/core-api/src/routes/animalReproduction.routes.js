const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/animalReproduction.controller');
const validate = require('../middleware/validate');

const TYPES = ['MONTA', 'INSEMINACION', 'GESTACION_CONFIRMADA', 'PARTO', 'ABORTO'];

const createValidators = [
  body('type').isIn(TYPES).withMessage(`type debe ser uno de: ${TYPES.join(', ')}`),
  body('date').isISO8601().withMessage('date es requerido y debe ser una fecha válida'),
  body('expectedDate').optional({ values: 'falsy' }).isISO8601().withMessage('expectedDate inválida'),
  body('offspringCount').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('offspringCount debe ser un entero positivo'),
];

const updateValidators = [
  body('type').optional().isIn(TYPES).withMessage(`type debe ser uno de: ${TYPES.join(', ')}`),
  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('date inválida'),
  body('expectedDate').optional({ values: 'falsy' }).isISO8601().withMessage('expectedDate inválida'),
  body('offspringCount').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('offspringCount debe ser un entero positivo'),
];

router.get('/', ctrl.list);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
