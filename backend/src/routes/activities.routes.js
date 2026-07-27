const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/activities.controller');
const jornalesRoutes = require('./jornales.routes');

router.use('/:activityId/jornales', jornalesRoutes);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
