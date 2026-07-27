const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/weather.controller');

router.get('/', ctrl.getForecast);

module.exports = router;
