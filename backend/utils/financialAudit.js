const { randomUUID } = require("crypto");
const pool = require("../lib/db");

async function auditFinancialEvent({
  eventType,
  userId = null,
  transactionId = null,
  paymentId = null,
  walletUserId = null,
  amount = null,
  metadata = null,
  connection = null
}) {

  const conn = connection || await pool.getConnection();
  const external = !!connection;

  try {

    await conn.query(
      `
      INSERT INTO financial_audit_log
      (
        id,
        event_type,
        user_id,
        transaction_id,
        payment_id,
        wallet_user_id,
        amount,
        metadata
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        eventType,
        userId,
        transactionId,
        paymentId,
        walletUserId,
        amount,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

  } finally {
    if (!external) conn.release();
  }
}

module.exports = { auditFinancialEvent };
