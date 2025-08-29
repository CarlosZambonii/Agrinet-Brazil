const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/conversation_controller');

router.use(auth);
router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.put('/:id', ctrl.rename);
router.delete('/:id', ctrl.remove);
router.post('/:id/pin', ctrl.pin);

module.exports = router;
