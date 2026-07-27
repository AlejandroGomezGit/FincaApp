const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/analytics.controller');

router.get('/forecast', ctrl.forecast);

module.exports = router;
