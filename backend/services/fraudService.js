const pool = require("../lib/db");

async function calculateTransactionFraudScore(buyerId, sellerId, amount) {
  let score = 0;

  if (amount > 5000) score += 40;

  const [recent] = await pool.query(
    `
    SELECT COUNT(*) as total
    FROM transactions
    WHERE buyer_id = ?
      AND created_at > NOW() - INTERVAL 10 MINUTE
    `,
    [buyerId]
  );

  if (recent[0].total >= 5) score += 30;

  const [pair] = await pool.query(
    `
    SELECT COUNT(*) as total
    FROM transactions
    WHERE buyer_id = ?
      AND seller_id = ?
      AND created_at > NOW() - INTERVAL 30 MINUTE
    `,
    [buyerId, sellerId]
  );

  if (pair[0].total >= 3) score += 30;

  return score;
}

async function calculateUserFraudScore(userId) {
  let score = 0;

  const [[velocity]] = await pool.query(
    `
    SELECT COUNT(*) as count
    FROM wallet_history
    WHERE user_id = ?
    AND created_at >= NOW() - INTERVAL 10 MINUTE
  `,
    [userId]
  );

  if (velocity.count >= 5) score += 30;

  const [[disputes]] = await pool.query(
    `
    SELECT COUNT(*) as count
    FROM disputes
    WHERE opened_by = ?
  `,
    [userId]
  );

  score += disputes.count * 10;

  const [[refunds]] = await pool.query(
    `
    SELECT COUNT(*) as count
    FROM wallet_history
    WHERE user_id = ?
    AND type = 'refund'
  `,
    [userId]
  );

  score += refunds.count * 5;

  const [[age]] = await pool.query(
    `
    SELECT TIMESTAMPDIFF(DAY, created_at, NOW()) as days
    FROM users
    WHERE id = ?
  `,
    [userId]
  );

  if (age.days < 7) score += 20;

  let trustLevel = "new";

  if (score >= 70) trustLevel = "restricted";
  else if (score >= 40) trustLevel = "verified";
  else if (score < 10) trustLevel = "trusted";

  await pool.query(
    `
    UPDATE users
    SET fraud_score = ?, trust_level = ?
    WHERE id = ?
    `,
    [score, trustLevel, userId]
  );

  return score;
}

async function calculateFraudScore(a, b, c) {
  if (typeof b === "undefined") {
    const userId = a;
    return calculateUserFraudScore(userId);
  }

  const buyerId = a;
  const sellerId = b;
  const amount = c;

  return calculateTransactionFraudScore(buyerId, sellerId, amount);
}

module.exports = { calculateFraudScore };
