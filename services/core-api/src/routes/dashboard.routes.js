const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/dashboard.controller');

router.get('/summary', ctrl.summary);
router.get('/monthly-balance', ctrl.monthlyBalance);
router.get('/activity-costs', ctrl.activityCosts);

module.exports = router;
