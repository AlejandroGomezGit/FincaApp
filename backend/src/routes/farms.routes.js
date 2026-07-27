const router = require('express').Router();
const ctrl = require('../controllers/farms.controller');

router.get('/', ctrl.list);
router.get('/ranking', ctrl.ranking);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
