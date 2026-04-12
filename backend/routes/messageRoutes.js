const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const { randomUUID } = require('crypto');
const pool = require('../lib/db');
const { strictWriteLimiter, userRateLimiter } = require('../middlewares/rateLimiters');
const { sanitizeFields } = require('../middleware/sanitizeInput');
const upload = require('../middleware/uploadMiddleware');
const { uploadFile } = require('../lib/storage');
const { messagesSentTotal } = require('../lib/metrics');

router.use(auth);

router.post(
  '/',
  upload.single('file'),
  userRateLimiter,
  strictWriteLimiter,
  sanitizeFields(["message"]),
  [
    body('conversation_id').isUUID(),
    body('message').isString().isLength({ min: 1, max: 2000 })
  ],
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { conversation_id, message } = req.body;
  const senderId = req.user.id;

  const id = randomUUID();
  let attachmentUrl = null;
  let attachmentType = null;

  if (req.file) {
    attachmentUrl = await uploadFile(req.file.buffer, req.file.mimetype, "chat");
    attachmentType = req.file.mimetype;
  }

  const [conv] = await pool.query(
    `
    SELECT *
    FROM conversations
    WHERE id = ?
      AND (buyer_id = ? OR seller_id = ?)
    `,
    [conversation_id, senderId, senderId]
  );

  if (!conv.length) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  await pool.query(
    `
    INSERT INTO messages (
      id,
      conversation_id,
      sender_id,
      message,
      attachment_url,
      attachment_type
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [id, conversation_id, senderId, message, attachmentUrl, attachmentType]
  );

  messagesSentTotal.inc();

  const [messageCountRows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM messages
    WHERE conversation_id = ?
    `,
    [conversation_id]
  );

  if (Number(messageCountRows[0].total) === 1) {
    await pool.query(
      "UPDATE listing_stats SET messages_started = messages_started + 1 WHERE listing_id = ?",
      [conv[0].listing_id]
    );
  }

  res.status(201).json({
    id,
    conversation_id,
    sender_id: senderId,
    message,
    attachment_url: attachmentUrl,
    attachment_type: attachmentType
  });
  }
);

router.get('/', async (req, res) => {

  const { conversation_id, cursor } = req.query;

  await pool.query(
    `
    UPDATE messages
    SET delivery_status = 'delivered'
    WHERE conversation_id = ?
    AND sender_id != ?
    AND delivery_status = 'sent'
    `,
    [conversation_id, req.user.id]
  );

  let query = `
    SELECT id, sender_id, message, created_at
    FROM messages
    WHERE conversation_id = ?
  `;

  const values = [conversation_id];

  if (cursor) {
    query += ` AND created_at < ?`;
    values.push(cursor);
  }

  query += `
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const [rows] = await pool.query(query, values);

  const nextCursor = rows.length ? rows[rows.length - 1].created_at : null;

  res.json({
    messages: rows.reverse(),
    nextCursor
  });

});

router.post('/:conversationId/read', async (req, res) => {
  const conversationId = req.params.conversationId;

  await pool.query(
    `
    UPDATE messages
    SET delivery_status = 'read'
    WHERE conversation_id = ?
    AND sender_id != ?
    `,
    [conversationId, req.user.id]
  );

  res.json({ message: "Messages marked as read" });
});

module.exports = router;
