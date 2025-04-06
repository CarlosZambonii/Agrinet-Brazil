const express = require("express");
const router = express.Router();
const Listing = require("../models/marketplace/listing");
const Transaction = require("../models/transaction");
const User = require("../models/user");

// Export core objects
router.get("/export", async (req, res) => {
  try {
    const listings = await Listing.find();
    const transactions = await Transaction.find();
    const users = await User.find({}, "_id email reputationScore role");
    res.json({ listings, transactions, users });
  } catch (error) {
    res.status(500).json({ error: "Export error" });
  }
});

// Import core objects
router.post("/import", async (req, res) => {
  try {
    const { listings, transactions, users } = req.body;
    if (listings) await Listing.insertMany(listings);
    if (transactions) await Transaction.insertMany(transactions);
    if (users) await User.insertMany(users);
    res.json({ message: "Data imported successfully" });
  } catch (error) {
    res.status(500).json({ error: "Import error" });
  }
});

module.exports = router;
