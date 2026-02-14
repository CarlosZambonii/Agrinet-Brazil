const pool = require('../lib/db');
const crypto = require('crypto');

exports.createTransaction = async (req, res) => {
  try {
    const { contractId, consumerId, producerId } = req.body;
    const id = crypto.randomUUID();

    await pool.query(
      `INSERT INTO transactions 
       (id, buyer_id, seller_id, listing_id, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, consumerId, producerId, contractId, 'pending']
    );

    res.status(201).json({
      message: 'Transaction created',
      data: { id, consumerId, producerId, contractId }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.submitRating = async (req, res) => {
  try {
    const { transactionId, rating, raterId, feedback = '' } = req.body;

    if (rating < -1 || rating > 4) {
      return res.status(400).json({ error: 'Invalid rating value' });
    }

    const [[transaction]] = await pool.query(
      `SELECT * FROM transactions WHERE id = ?`,
      [transactionId]
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    let rateeId;

    if (raterId === transaction.buyer_id) {
      rateeId = transaction.seller_id;
    } else if (raterId === transaction.seller_id) {
      rateeId = transaction.buyer_id;
    } else {
      return res.status(403).json({ error: 'Rater not part of transaction' });
    }

    await pool.query(
      `UPDATE users 
       SET reputation_score = reputation_score + ?
       WHERE id = ?`,
      [rating, rateeId]
    );

    res.json({ message: 'Rating submitted successfully' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
