const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const pool = require("../lib/db");
const walletRepository = require("../repositories/walletRepository");
const { auditFinancialEvent } = require("../utils/financialAudit");
const {
  stripePaymentSucceededTotal,
  stripePaymentFailed,
  stripeRefundTotal,
  stripeAmountMismatch,
  fraudBlocked
} = require("../lib/metrics");
const {
  velocityTriggerTotal,
  userBlockTotal,
  refundTotal,
  failedPaymentTotal,
  duplicateEventTotal
} = require("../lib/metrics");

module.exports = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("Webhook received:", event.type);

  if (
    event.type === "payment_intent.succeeded" &&
    event.data.object.status === "succeeded"
  ) {
    const paymentIntent = event.data.object;
    const amount = paymentIntent.amount / 100;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      console.log("Webhook PI ID:", paymentIntent.id);

      const [rows] = await connection.query(
        'SELECT * FROM payments WHERE id = ? FOR UPDATE',
        [paymentIntent.id]
      );

      console.log("Payments rows:", rows);

      const payment = rows[0];

      if (!payment) {
        throw new Error('Payment not registered internally');
      }

      const stripeAmount = paymentIntent.amount; // inteiro em centavos
      const stripeCurrency = paymentIntent.currency;

      if (stripeCurrency !== "brl") {
        throw new Error("Invalid currency");
      }

      if (stripeAmount !== Number(payment.amount) * 100) {
        throw new Error("Amount mismatch (raw)");
      }

      if (Number(payment.amount) !== Number(amount)) {
        stripeAmountMismatch.inc();
        throw new Error("Amount mismatch");
      }

      if (payment.status === "succeeded") {
        duplicateEventTotal.inc();
        console.log("Already processed");
        await connection.commit();
        return res.json({ received: true });
      }

      const [result] = await connection.query(
        `
        UPDATE payments
        SET status = 'succeeded'
        WHERE id = ?
        AND status = 'pending'
        `,
        [paymentIntent.id]
      );

      if (result.affectedRows === 0) {
        duplicateEventTotal.inc();
        console.log("Already processed or invalid state");
        await connection.commit();
        return res.json({ received: true });
      }

      const transactionId = paymentIntent.metadata?.transactionId;

      if (transactionId) {
        await connection.query(
          `UPDATE transactions
           SET status = 'paid'
           WHERE id = ? AND status = 'pending'`,
          [transactionId]
        );
      }

      console.log("Crediting wallet...");

      await walletRepository.credit(
        payment.user_id,
        Number(payment.amount),
        "Stripe deposit",
        null,
        paymentIntent.id,
        "deposit",
        connection
      );

      await auditFinancialEvent({
        eventType: "payment",
        userId: payment.user_id,
        paymentId: paymentIntent.id,
        amount: Number(payment.amount),
        metadata: {
          provider: "stripe",
          type: "deposit"
        },
        connection
      });

      const [velocityRows] = await connection.query(
        `
        SELECT COUNT(*) as count
        FROM wallet_history
        WHERE user_id = ?
        AND type = 'deposit'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        `,
        [payment.user_id]
      );

      const depositCount = velocityRows[0].count;

      if (depositCount >= 8) {
        await connection.query(
          `
          UPDATE users
          SET
            is_blocked = 1,
            block_level = 'hard',
            blocked_until = NOW() + INTERVAL 30 MINUTE
          WHERE id = ?
          `,
          [payment.user_id]
        );

        await connection.query(
          "INSERT INTO fraud_logs (user_id, reason) VALUES (?, ?)",
          [payment.user_id, 'velocity_hard']
        );
        velocityTriggerTotal.inc();
        userBlockTotal.inc();

      } else if (depositCount >= 5) {
        await connection.query(
          `
          UPDATE users
          SET
            is_blocked = 1,
            block_level = 'soft',
            blocked_until = NOW() + INTERVAL 15 MINUTE
          WHERE id = ?
          `,
          [payment.user_id]
        );

        await connection.query(
          "INSERT INTO fraud_logs (user_id, reason) VALUES (?, ?)",
          [payment.user_id, 'velocity_soft']
        );
        velocityTriggerTotal.inc();
        userBlockTotal.inc();
      }
      try {
        stripePaymentSucceededTotal.inc();
      } catch (e) {
        console.error("Metric error:", e.message);
      }

      await connection.commit();
      console.log("Wallet credited successfully");
    } catch (e) {
      await connection.rollback();
      stripePaymentFailed.inc();
      console.error("Webhook failed:", e.message);
      return res.status(500).json({ error: "webhook failed" });
    } finally {
      connection.release();
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentId = charge.payment_intent;
    const refundedAmount = event.data.object.amount / 100;
    const refundId = charge.refunds?.data?.[0]?.id;

    if (!refundId) {
      throw new Error("Refund id not found");
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [rows] = await connection.query(
        "SELECT user_id, amount, refunded_amount FROM payments WHERE id = ? FOR UPDATE",
        [paymentId]
      );

      if (rows.length === 0) {
        throw new Error("Payment not found for refund");
      }

      const payment = rows[0];

      if (Number(payment.refunded_amount) >= Number(refundedAmount)) {
        await connection.commit();
        return res.json({ received: true });
      }

      const [existing] = await connection.query(
        `
        SELECT id FROM wallet_history
        WHERE payment_id = ?
        AND type = 'refund'
        FOR UPDATE
        `,
        [refundId]
      );

      if (existing.length > 0) {
        console.log("Refund already processed (safe)");
        duplicateEventTotal.inc();
        await connection.commit();
        return res.json({ received: true });
      }

      const amount = refundedAmount;

      const [refundSumRows] = await connection.query(
        `
        SELECT COALESCE(SUM(amount), 0) AS total_refunded
        FROM wallet_history
        WHERE payment_id = ?
          AND type = 'refund'
        FOR UPDATE
        `,
        [paymentId]
      );

      const alreadyRefunded = Math.abs(Number(refundSumRows[0].total_refunded));
      const originalAmount = Number(payment.amount);

      if (alreadyRefunded + amount > originalAmount) {
        throw new Error("Refund exceeds original payment");
      }

      await connection.query(
        `
        UPDATE payments
        SET
          refunded_amount = refunded_amount + ?,
          status = CASE
            WHEN refunded_amount + ? >= amount THEN 'refunded'
            ELSE 'partially_refunded'
          END
        WHERE id = ?
        `,
        [refundedAmount, refundedAmount, paymentId]
      );

      console.log("RefundId:", refundId);
      await walletRepository.credit(
        payment.user_id,
        -refundedAmount,
        "Stripe refund",
        null,
        refundId,
        "refund",
        connection
      );

      await connection.commit();
      stripeRefundTotal.inc();
      refundTotal.inc();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const paymentId = pi.id;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [rows] = await connection.query(
        "SELECT user_id, status FROM payments WHERE id = ? FOR UPDATE",
        [paymentId]
      );

      if (rows.length === 0) {
        throw new Error("Payment not registered internally");
      }

      if (rows[0].status !== "pending") {
        await connection.commit();
        return res.json({ received: true });
      }

      await connection.query(
        `
      UPDATE payments
      SET status = 'failed'
      WHERE id = ?
      `,
        [paymentId]
      );
      failedPaymentTotal.inc();

      const payment = rows[0];

      const [failures] = await connection.query(
        `
        SELECT COUNT(*) as total
        FROM payments
        WHERE user_id = ?
        AND status = 'failed'
        AND created_at >= NOW() - INTERVAL 10 MINUTE
        FOR UPDATE
        `,
        [payment.user_id]
      );

      if (failures[0].total >= 5) {
        console.log("🚨 Fraud detected: too many failed attempts");

        await connection.query(
          `
          UPDATE users
          SET
            is_blocked = 1,
            block_level = 'soft',
            blocked_until = NOW() + INTERVAL 15 MINUTE
          WHERE id = ?
          `,
          [payment.user_id]
        );
        await connection.query(
          "INSERT INTO fraud_logs (user_id, reason) VALUES (?, ?)",
          [payment.user_id, 'failed_payment_velocity']
        );
        fraudBlocked.inc();
        userBlockTotal.inc();
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      console.error("Payment failed webhook error:", err.message);
      return res.status(500).json({ error: "webhook failed" });
    } finally {
      connection.release();
    }

    return res.json({ received: true });
  }

  res.json({ received: true });
};
