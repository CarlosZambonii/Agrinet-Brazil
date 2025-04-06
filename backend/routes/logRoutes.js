const express = require("express");
const router = express.Router();
const TransactionLog = require("../models/transactionLog");
const authMiddleware = require("../middleware/authMiddleware");

// Admin: view all logs or filter by transactionId
router.get("/logs", authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.query;
    const filter = transactionId ? { transactionId } : {};
    const logs = await TransactionLog.find(filter).populate("actorId").sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Error retrieving logs" });
  }
});

module.exports = router;
