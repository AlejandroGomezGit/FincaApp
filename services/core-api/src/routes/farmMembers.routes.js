const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const ctrl = require('../controllers/farmMembers.controller');
const validate = require('../middleware/validate');
const requireFarmOwner = require('../middleware/requireFarmOwner');

const inviteValidators = [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
];

router.get('/', ctrl.list);
router.post('/', requireFarmOwner, inviteValidators, validate, ctrl.invite);
router.delete('/:memberId', requireFarmOwner, ctrl.remove);

module.exports = router;
