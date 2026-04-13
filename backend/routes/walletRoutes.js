const express = require('express');
const pool = require('../lib/db');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticateToken);

/* GET /wallet — saldo */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT balance FROM wallets WHERE user_id = ?', [req.user.id]
    );
    const balance = rows[0]?.balance ?? 0;
    res.json({ balance: Number(balance) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET /wallet/history — movimentações */
router.get('/history', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM wallet_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ history: rows });
  } catch (e) {
    // tabela pode não existir ainda, retorna vazio
    res.json({ history: [] });
  }
});

module.exports = router;
