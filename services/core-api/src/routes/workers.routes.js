const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/workers.controller');
const validate = require('../middleware/validate');

const workerValidators = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Teléfono inválido'),
  body('idNumber').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Documento inválido'),
  body('active').optional().isBoolean().withMessage('active debe ser booleano'),
];

router.get('/', ctrl.list);
router.post('/', workerValidators, validate, ctrl.create);
router.put('/:id', workerValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
