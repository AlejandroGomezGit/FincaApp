const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const registerValidators = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Contraseña requerida'),
];

router.post('/register', authLimiter, registerValidators, validate, ctrl.register);
router.post('/login', authLimiter, loginValidators, validate, ctrl.login);
router.post('/refresh', authLimiter, ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', auth, ctrl.me);
router.get('/admin/users', auth, requireRole('ADMIN'), ctrl.listUsers);

module.exports = router;
