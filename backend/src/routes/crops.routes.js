const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/crops.controller');
const actRoutes = require('./activities.routes');
const projRoutes = require('./projections.routes');

router.use('/:cropId/activities', actRoutes);
router.use('/:cropId/projections', projRoutes);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
