const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/alerts.controller');

router.get('/', ctrl.list);

module.exports = router;
