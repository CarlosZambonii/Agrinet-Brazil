const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const depositController = require("../controllers/deposit_controller");

// All routes are protected
router.use(authMiddleware);

// Get or create user deposit account
router.get("/", depositController.getOrCreateAccount);

// Fund account
router.post("/fund", depositController.fundAccount);

// Withdraw from account
router.post("/withdraw", depositController.withdrawAccount);

// Get transaction history
router.get("/history", depositController.getTransactionHistory);

module.exports = router;
