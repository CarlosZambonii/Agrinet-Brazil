const express = require("express");
const { createPixPayment } = require("../services/stripeService");
const { authenticateToken } = require("../middleware/authMiddleware");
const { strictWriteLimiter, userRateLimiter } = require("../middlewares/rateLimiters");
const pool = require("../lib/db");

const router = express.Router();

router.post("/pix/create", authenticateToken, userRateLimiter, strictWriteLimiter, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const paymentIntent = await createPixPayment({ amount, userId });

    await pool.query(
      `
      INSERT INTO payments (
        id,
        user_id,
        amount,
        status,
        provider,
        expires_at
      )
      VALUES (?, ?, ?, 'pending', 'stripe', DATE_ADD(NOW(), INTERVAL 15 MINUTE))
      `,
      [paymentIntent.id, userId, amount]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
