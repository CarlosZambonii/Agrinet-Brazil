const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// Marketplace Schema
const ListingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["product", "service", "plan", "agrotourism"], required: true },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  location: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Listing = mongoose.model("Listing", ListingSchema);

// Create Listing
router.post("/listings", async (req, res) => {
  try {
    const newListing = new Listing(req.body);
    await newListing.save();
    res.status(201).json({ message: "Listing created successfully", listing: newListing });
  } catch (error) {
    res.status(500).json({ error: "Error creating listing" });
  }
});

// Get Listings
router.get("/listings", async (req, res) => {
  try {
    const listings = await Listing.find();
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: "Error fetching listings" });
  }
});

// Transaction Schema
const TransactionSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model("Transaction", TransactionSchema);

// Create Transaction
router.post("/transactions", async (req, res) => {
  try {
    const newTransaction = new Transaction(req.body);
    await newTransaction.save();
    res.status(201).json({ message: "Transaction initiated", transaction: newTransaction });
  } catch (error) {
    res.status(500).json({ error: "Error initiating transaction" });
  }
});

// Get Transactions
router.get("/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find().populate("buyerId sellerId listingId");
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Error fetching transactions" });
  }
});

module.exports = router;