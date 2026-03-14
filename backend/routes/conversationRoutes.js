const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/conversation_controller');
const asyncHandler = require('../utils/asyncHandler');

router.use(auth);
router.post('/', (req, res, next) => {

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Invalid conversation payload" });
  }

  next();

}, asyncHandler(ctrl.create));
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', (req, res, next) => {

  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid conversation id" });
  }

  next();

}, asyncHandler(ctrl.get));
router.put('/:id', (req, res, next) => {

  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid conversation id" });
  }

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  next();

}, asyncHandler(ctrl.rename));
router.delete('/:id', (req, res, next) => {

  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid conversation id" });
  }

  next();

}, asyncHandler(ctrl.remove));
router.post('/:id/pin', (req, res, next) => {

  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid conversation id" });
  }

  next();

}, asyncHandler(ctrl.pin));

module.exports = router;
