const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/farms.controller');
const validate = require('../middleware/validate');
const requireFarmOwner = require('../middleware/requireFarmOwner');

const farmValidators = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  body('location').optional({ values: 'falsy' }).trim().isLength({ max: 200 }).withMessage('Ubicación demasiado larga'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Descripción demasiado larga'),
  body('hectares').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Hectáreas debe ser un número positivo'),
];

router.get('/', ctrl.list);
router.get('/ranking', ctrl.ranking);
router.get('/:id', ctrl.get);
router.post('/', farmValidators, validate, ctrl.create);
router.put('/:id', farmValidators, validate, ctrl.update);
router.delete('/:id', requireFarmOwner, ctrl.remove);

router.use('/:farmId/members', require('./farmMembers.routes'));
router.use('/demo', require('./demoData.routes'));

module.exports = router;
