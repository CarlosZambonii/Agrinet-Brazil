const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Listing = require("../marketplace/models/listings");
const Transaction = require("../models/transaction");

// 1. Top Rated Producers
router.get("/top-rated", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const topUsers = await User.aggregate([
      { $sort: { reputationScore: -1 } },
      { $limit: limit },
      {
        $project: {
          name: 1,
          email: 1,
          reputationScore: 1,
          location: 1
        }
      }
    ]);

    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ error: "Aggregation failed" });
  }
});

// 2. Market Volume by Region
router.get("/market-volume", async (req, res) => {
  try {
    const volume = await Listing.aggregate([
      {
        $group: {
          _id: "$location",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(volume);
  } catch (err) {
    res.status(500).json({ error: "Aggregation failed" });
  }
});

// 3. Listing Trends Over Time
router.get("/listing-trends", async (req, res) => {
  try {
    const data = await Listing.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Aggregation failed" });
  }
});

// 4. Ping Responsiveness
router.get("/ping-response", async (req, res) => {
  try {
    const response = await Transaction.aggregate([
      {
        $project: {
          buyerId: 1,
          sellerId: 1,
          pingCount: 1,
          daysSinceLastPing: {
            $divide: [{ $subtract: [new Date(), "$lastPing"] }, 86400000]
          }
        }
      },
      {
        $group: {
          _id: "$sellerId",
          avgDays: { $avg: "$daysSinceLastPing" }
        }
      },
      { $sort: { avgDays: 1 } }
    ]);

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Aggregation failed" });
  }
});

module.exports = router;
