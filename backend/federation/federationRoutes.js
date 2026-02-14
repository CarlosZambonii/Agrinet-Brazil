const express = require('express');
const router = express.Router();
const pool = require('../lib/db');

// GET /federation/export?since=ISO_DATE
router.get('/export', async (req, res) => {
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const { since } = req.query;

    let usersQuery = `SELECT * FROM users`;
    let transactionsQuery = `SELECT * FROM transactions`;

    const params = [];

    if (since) {
      usersQuery += ` WHERE updated_at > ?`;
      transactionsQuery += ` WHERE updated_at > ?`;
      params.push(new Date(since));
    }

    const [users] = await pool.query(usersQuery, params);
    const [transactions] = await pool.query(transactionsQuery, params);

    res.json({
      users,
      transactions,
      exportedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error("Federation export error:", err);
    res.status(500).json({ error: "Export failed" });
  }
});

// Import route for federation sync (SQL version)
router.post('/import', async (req, res) => {
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const connection = await pool.getConnection();
  try {
    const { listings = [], transactions = [], users = [] } = req.body;

    await connection.beginTransaction();

    for (const user of users) {
      const updatedAt = user.updated_at
        ? new Date(user.updated_at).toISOString().slice(0, 19).replace("T", " ")
        : null;

      await connection.query(
        `
        INSERT INTO users (id, email, reputation_score, updated_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          email = VALUES(email),
          reputation_score = VALUES(reputation_score),
          updated_at = VALUES(updated_at)
        `,
        [
          user.id,
          user.email,
          user.reputation_score || 0,
          updatedAt
        ]
      );
    }

    for (const listing of listings) {
      await connection.query(
        `INSERT INTO listings SET ?
         ON DUPLICATE KEY UPDATE id = id`,
        listing
      );
    }

    for (const tx of transactions) {
      await connection.query(
        `
        INSERT INTO transactions (
          id, buyer_id, seller_id, listing_id, listing_title,
          amount, status, buyer_rated, seller_rated,
          rating_given, escrow_locked,
          escrow_released_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status),
          buyer_rated = VALUES(buyer_rated),
          seller_rated = VALUES(seller_rated),
          rating_given = VALUES(rating_given),
          escrow_locked = VALUES(escrow_locked),
          escrow_released_at = VALUES(escrow_released_at),
          updated_at = VALUES(updated_at)
        `,
        [
          tx.id,
          tx.buyer_id,
          tx.seller_id,
          tx.listing_id || null,
          tx.listing_title || null,
          tx.amount,
          tx.status,
          tx.buyer_rated ? 1 : 0,
          tx.seller_rated ? 1 : 0,
          tx.rating_given ? 1 : 0,
          tx.escrow_locked ? 1 : 0,
          tx.escrow_released_at
            ? new Date(tx.escrow_released_at)
            : null,
          tx.created_at ? new Date(tx.created_at) : new Date(),
          tx.updated_at ? new Date(tx.updated_at) : new Date()
        ]
      );
    }

    await connection.commit();

    res.json({ message: 'Import successful' });
  } catch (err) {
    await connection.rollback();
    console.error('Federation import error:', err);
    res.status(500).json({ error: 'Import failed' });
  } finally {
    connection.release();
  }
});

module.exports = router;
