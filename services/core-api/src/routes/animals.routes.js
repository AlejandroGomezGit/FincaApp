const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/animals.controller');
const validate = require('../middleware/validate');
const weightsRoutes = require('./animalWeights.routes');
const reproductionRoutes = require('./animalReproduction.routes');

const SEXES = ['MACHO', 'HEMBRA'];
const STATUSES = ['ACTIVE', 'SOLD', 'DECEASED'];

const createValidators = [
  body('tag').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).withMessage('tag demasiado largo'),
  body('sex').optional({ values: 'falsy' }).isIn(SEXES).withMessage(`sex debe ser uno de: ${SEXES.join(', ')}`),
  body('birthDate').optional({ values: 'falsy' }).isISO8601().withMessage('birthDate inválida'),
  body('breed').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('breed demasiado largo'),
];

const updateValidators = [
  ...createValidators,
  body('status').optional().isIn(STATUSES).withMessage(`status debe ser uno de: ${STATUSES.join(', ')}`),
];

router.use('/:animalId/weights', weightsRoutes);
router.use('/:animalId/reproduction', reproductionRoutes);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', createValidators, validate, ctrl.create);
router.put('/:id', updateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
