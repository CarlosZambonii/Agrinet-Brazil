const express = require("express");
const { randomUUID } = require("crypto");
const pool = require("../lib/db");
const listingRepository = require("../repositories/listingRepository");
const broadcastRepository = require("../repositories/broadcastRepository");
const transactionRepository = require("../repositories/transactionRepository");
const userRepository = require("../repositories/userRepository");
const asyncHandler = require('../utils/asyncHandler');
const { strictWriteLimiter } = require("../middlewares/rateLimiters");
const requireAuth = require("../middleware/requireAuth");

const { createBroadcastItem } = require("./models/broadcasts");


const router = express.Router();

// Create a new broadcast
router.post("/broadcasts", asyncHandler(async (req, res) => {
  const id = randomUUID();
  const item = createBroadcastItem({ id, ...req.body });
  await broadcastRepository.create(item);
  res
    .status(201)
    .json({ message: "Broadcast posted successfully", broadcast: item });
}));

// Retrieve all broadcast messages
router.get("/broadcasts", asyncHandler(async (req, res) => {
  const items = await broadcastRepository.findAll();
  res.json(items);
}));

// Create a new service listing following AgriNet protocol
router.post("/listings", asyncHandler(async (req, res) => {
  const {
    title,
    category,
    description,
    price,
    location,
    userId
  } = req.body;

  if (!title || !category || !description || !userId) {
    const err = new Error("Missing required fields");
    err.statusCode = 400;
    throw err;
  }

  const id = require("crypto").randomUUID();

  const listing = await listingRepository.create({
    id,
    userId,
    title,
    category,
    description,
    price,
    location
  });

  res.status(201).json({
    message: "Listing created successfully",
    listing
  });
}));

// Retrieve listings with filtering options
router.get("/listings", asyncHandler(async (req, res) => {
  const listings = await listingRepository.findAll();
  res.json(listings);
}));

// Create a new transaction
const transactionService = require("../services/transactionService");

router.post("/transactions", requireAuth, strictWriteLimiter, asyncHandler(async (req, res) => {
  const buyerId = req.user.id;
  const { sellerId, amount, listingId, listingTitle } = req.body;

  const result = await transactionService.createTransactionWithWalletDebit({
    buyerId,
    sellerId,
    amount,
    listingId,
    listingTitle
  });
  res.status(201).json(result);
}));



// Release escrow funds
router.post("/transactions/release-escrow", strictWriteLimiter, asyncHandler(async (req, res) => {
  const result = await transactionService.releaseEscrow(req.body.transactionId);
  res.json(result);
}));



// Retrieve all transactions
router.get("/transactions", asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, sort, order, flagged } = req.query;

  const result = await transactionRepository.findPaginated({
    status,
    page: Number(page),
    limit: Number(limit),
    sort,
    order,
    flagged
  });

  res.json({
    data: result.rows,
    page: Number(page),
    limit: Number(limit),
    total: result.total
  });
}));



// Validate dialog content
router.post("/transactions/dialog-validate", asyncHandler(async (req, res) => {
  const { transactionId, dialogNotes } = req.body;

  const transaction = await transactionRepository.findById(transactionId);
  if (!transaction)
    return res.status(404).json({ error: "Transaction not found" });

  const buyer = await userRepository.findById(transaction.buyerId);
  const userReputation = buyer?.reputationScore || 0;

  const expectedKeywords = (transaction.listingTitle || "")
    .toLowerCase()
    .split(" ");

  const dialogWords = dialogNotes.toLowerCase().split(" ");
  const matches = expectedKeywords.filter(word => dialogWords.includes(word));

  const confidence =
    expectedKeywords.length > 0
      ? matches.length / expectedKeywords.length
      : 0;

  const dialogConfirmed = confidence >= 0.6 && userReputation >= 0;
  const flaggedForReview = !dialogConfirmed;

  const updated = await transactionRepository.updateDialog(
    transactionId,
    dialogNotes,
    dialogConfirmed,
    flaggedForReview
  );

  res.json({
    message: "Dialog validation complete",
    dialogConfirmed: updated.dialogConfirmed,
    flaggedForReview: updated.flaggedForReview,
    confidence,
    userReputation
  });
}));


// Submit a rating
router.post("/transactions/rate", requireAuth, strictWriteLimiter, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { transactionId, rating } = req.body;

  const result = await transactionService.rateTransaction(
    transactionId,
    rating,
    userId
  );

  res.json(result);
}));


// Log transaction activity (PING)
router.post("/transactions/ping", asyncHandler(async (req, res) => {
  const result = await transactionService.pingTransaction(req.body.transactionId);
  res.json(result);
}));

router.get("/admin/flagged-transactions", asyncHandler(async (req, res) => {
  const { sort = "created_at", order = "DESC" } = req.query;
  const allowedSort = ["created_at", "fraud_score"];
  const allowedOrder = ["ASC", "DESC"];
  const safeSort = allowedSort.includes(String(sort)) ? String(sort) : "created_at";
  const safeOrder = allowedOrder.includes(String(order).toUpperCase())
    ? String(order).toUpperCase()
    : "DESC";

  const [rows] = await pool.query(
    `SELECT * FROM transactions WHERE flagged_for_review = 1 ORDER BY ${safeSort} ${safeOrder}`
  );
  res.json(rows);
}));

router.post("/admin/resolve-flag", async (req, res, next) => {
  try {
    const { transactionId, action } = req.body;

    if (!transactionId || !action) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await transactionService.resolveFlag(transactionId, action);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
