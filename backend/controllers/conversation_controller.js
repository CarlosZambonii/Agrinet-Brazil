const { randomUUID } = require('crypto');
const pool = require('../lib/db');
const { conversationsCreatedTotal } = require('../lib/metrics');
// const Conversation = require('../models/conversation');

exports.create = async (req, res) => {
  const buyerId = req.user.id;
  const { listing_id } = req.body;

  const connection = await pool.getConnection();

  try {
    const [listingRows] = await connection.query(
      `SELECT user_id FROM listings WHERE id = ?`,
      [listing_id]
    );

    const listing = listingRows[0];

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const sellerId = listing.user_id;

    const id = randomUUID();

    const [existing] = await connection.query(
      `
      SELECT id
      FROM conversations
      WHERE listing_id = ?
        AND buyer_id = ?
        AND seller_id = ?
      `,
      [listing_id, buyerId, sellerId]
    );

    if (existing.length) {
      return res.json({
        id: existing[0].id,
        listing_id,
        buyer_id: buyerId,
        seller_id: sellerId
      });
    }

    await connection.query(
      `INSERT INTO conversations (
        id,
        listing_id,
        buyer_id,
        seller_id
      )
      VALUES (?, ?, ?, ?)`,
      [id, listing_id, buyerId, sellerId]
    );

    conversationsCreatedTotal.inc();

    await connection.query(
      "UPDATE listing_stats SET clicks = clicks + 1 WHERE listing_id = ?",
      [listing_id]
    );

    return res.status(201).json({
      id,
      listing_id,
      buyer_id: buyerId,
      seller_id: sellerId
    });
  } finally {
    connection.release();
  }
};

exports.list = async (req, res) => {

  const userId = req.user.id;

  const [rows] = await pool.query(
    `
    SELECT *
    FROM conversations
    WHERE buyer_id = ?
       OR seller_id = ?
    ORDER BY created_at DESC
    `,
    [userId, userId]
  );

  res.json(rows);
};

exports.get = async (req, res) => {

  const { id } = req.params;
  const userId = req.user.id;

  const [rows] = await pool.query(
    `
    SELECT *
    FROM conversations
    WHERE id = ?
      AND (buyer_id = ? OR seller_id = ?)
    `,
    [id, userId, userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  await pool.query(
    `
    UPDATE messages
    SET delivery_status = 'read'
    WHERE conversation_id = ?
    AND sender_id != ?
    `,
    [id, req.user.id]
  );

  const [messages] = await pool.query(
    `
    SELECT id, sender_id, message, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    `,
    [id]
  );

  res.json({
    conversation: rows[0],
    messages
  });

};

exports.rename = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  const [rows] = await pool.query(
    `
    SELECT *
    FROM conversations
    WHERE id = ?
      AND (buyer_id = ? OR seller_id = ?)
    `,
    [id, userId, userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  await pool.query(
    `UPDATE conversations SET name = ? WHERE id = ?`,
    [name, id]
  );

  res.json({ message: "Conversation renamed" });
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [rows] = await pool.query(
    `
    SELECT *
    FROM conversations
    WHERE id = ?
      AND (buyer_id = ? OR seller_id = ?)
    `,
    [id, userId, userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  await pool.query(
    `DELETE FROM conversations WHERE id = ?`,
    [id]
  );

  res.json({ message: "Conversation removed" });
};

exports.pin = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const [rows] = await pool.query(
    `
    SELECT *
    FROM conversations
    WHERE id = ?
      AND (buyer_id = ? OR seller_id = ?)
    `,
    [id, userId, userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  await pool.query(
    `UPDATE conversations SET pinned = 1 WHERE id = ?`,
    [id]
  );

  res.json({ message: "Conversation pinned" });
};
