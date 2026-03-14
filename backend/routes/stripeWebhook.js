const express = require("express");
const Stripe = require("stripe");
const pool = require("../lib/db");
const walletRepository = require("../repositories/walletRepository");

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function stripeWebhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.");
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    const userId = paymentIntent.metadata.userId;
    const amount = paymentIntent.amount / 100;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Idempotência: evita crédito duplicado
      const [existing] = await connection.query(
        "SELECT id FROM wallet_history WHERE payment_id = ? AND type = 'deposit'",
        [paymentIntent.id]
      );

      if (!existing.length) {
        await walletRepository.credit(
          userId,
          amount,
          "Stripe deposit",
          null,
          paymentIntent.id,
          "deposit"
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  res.json({ received: true });
}

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

module.exports = router;
