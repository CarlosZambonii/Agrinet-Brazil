const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const pool = require('../lib/db');

router.use(auth);

router.get('/', async (req, res) => {

  const userId = req.user.id;

  const [rows] = await pool.query(
    `
    SELECT id, type, message, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId]
  );

  res.json(rows);
});

router.post('/', async (req, res) => {

  const { user_id, type, message, entity_id } = req.body;

  const { randomUUID } = require('crypto');
  const id = randomUUID();

  await pool.query(
    `
    INSERT INTO notifications (
      id,
      user_id,
      type,
      entity_id,
      message
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [id, user_id, type, entity_id, message]
  );

  res.status(201).json({ id });

});

router.patch('/:id/read', async (req, res) => {

  const { id } = req.params;
  const userId = req.user.id;

  const [rows] = await pool.query(
    `
    SELECT *
    FROM notifications
    WHERE id = ?
      AND user_id = ?
    `,
    [id, userId]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Notification not found" });
  }

  await pool.query(
    `UPDATE notifications SET is_read = 1 WHERE id = ?`,
    [id]
  );

  res.json({ message: "Notification marked as read" });

});

module.exports = router;
