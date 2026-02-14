const pool = require("../lib/db");

async function calculateFraudScore(buyerId, sellerId, amount) {
  let score = 0;

  // Regra 1 — valor alto
  if (amount > 5000) score += 40;

  // Regra 2 — muitas transações nos últimos 10 minutos
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

  // Regra 3 — buyer e seller repetindo muito
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

module.exports = { calculateFraudScore };
