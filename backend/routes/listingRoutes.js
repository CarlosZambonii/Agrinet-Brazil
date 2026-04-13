const express = require('express');
const crypto  = require('crypto');
const pool    = require('../lib/db');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const { userRateLimiter, strictWriteLimiter } = require('../middlewares/rateLimiters');
const upload  = require('../middleware/uploadMiddleware');
const { uploadToR2 } = require('../lib/storage');

const router = express.Router();

/* ── GET /listings — lista pública ── */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      status   = 'active',
      category, state, city,
      minPrice, maxPrice,
      search,
      sort     = 'recent',
      limit    = 40,
      offset   = 0,
    } = req.query;

    let sql = `SELECT * FROM listings WHERE moderation_status = 'approved'`;
    const params = [];

    if (status)   { sql += ' AND status = ?';   params.push(status); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (state)    { sql += ' AND state = ?';    params.push(state); }
    if (city)     { sql += ' AND city LIKE ?';  params.push(`%${city}%`); }
    if (minPrice) { sql += ' AND price >= ?';   params.push(Number(minPrice)); }
    if (maxPrice) { sql += ' AND price <= ?';   params.push(Number(maxPrice)); }
    if (search)   { sql += ' AND (title LIKE ? OR city LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const orderMap = {
      recent:     'created_at DESC',
      price_asc:  'price ASC',
      price_desc: 'price DESC',
    };
    sql += ` ORDER BY ${orderMap[sort] || 'created_at DESC'}`;
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    res.json({ listings: rows, total: rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── POST /listings/upload-image — deve vir ANTES de /:id ── */
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── GET /listings/:id — detalhe ── */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Listing not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── POST /listings — criar ── */
router.post('/', authenticateToken, userRateLimiter, strictWriteLimiter, async (req, res) => {
  try {
    const {
      title, category, description = '', price, unit,
      quantity_available = 0, city, state,
    } = req.body;

    if (!title || !category || !price || !unit || !city || !state)
      return res.status(400).json({ error: 'Campos obrigatórios: title, category, price, unit, city, state' });

    const validCats = ['graos','frutas','gado','maquinas','outros'];
    if (!validCats.includes(category))
      return res.status(400).json({ error: 'Categoria inválida' });

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO listings
        (id, user_id, title, category, description, price, unit, quantity_available, city, state, status, moderation_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'approved')`,
      [id, req.user.id, title, category, description,
       Number(price), unit, Number(quantity_available),
       city, state.toUpperCase().slice(0, 2)]
    );

    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── PUT /listings/:id — editar (dono ou admin) ── */
router.put('/:id', authenticateToken, userRateLimiter, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Listing not found' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    const allowed = ['title','description','price','quantity_available','city','state','status','unit'];
    const updates = [];
    const params  = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { updates.push(`${k} = ?`); params.push(req.body[k]); }
    }
    if (!updates.length) return res.status(400).json({ error: 'Nada para atualizar' });

    params.push(req.params.id);
    await pool.query(`UPDATE listings SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ── DELETE /listings/:id — soft delete ── */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Listing not found' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden' });

    await pool.query(`UPDATE listings SET status = 'deleted' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
