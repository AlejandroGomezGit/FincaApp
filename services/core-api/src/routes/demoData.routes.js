const router = require('express').Router();
const ctrl = require('../controllers/demoData.controller');

router.post('/', ctrl.create);

module.exports = router;
