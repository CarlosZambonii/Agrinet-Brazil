const express = require('express');
const router = express.Router();
const commController = require('../controllers/communication_controller');
const auth = require('../middleware/authMiddleware');

router.use(auth);
router.post('/:conversationId', commController.sendMessage);
router.get('/:conversationId', commController.listMessages);

module.exports = router;
