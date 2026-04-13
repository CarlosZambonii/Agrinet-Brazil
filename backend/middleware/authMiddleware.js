const jwt = require('../utils/jwt');
const pool = require("../lib/db");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Token' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwt');

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE id = ?",
      [payload.id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Token' });
    }

    if (user.is_blocked && user.blocked_until) {
      if (new Date(user.blocked_until) < new Date()) {
        await pool.query(
          `
          UPDATE users
          SET is_blocked = 0,
              blocked_until = NULL
          WHERE id = ?
          `,
          [user.id]
        );

        user.is_blocked = 0;
      }
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: "Account blocked" });
    }

    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Token' });
  }
}

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.API_KEY || process.env.WIX_API_KEY;
  if (apiKey && apiKey === validKey) {
    return next();
  }

  return authenticateToken(req, res, next);
}

// Tenta autenticar mas não bloqueia se não tiver token
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwt');
  } catch {}
  return next();
}

module.exports = authMiddleware;
module.exports.authenticateToken = authenticateToken;
module.exports.optionalAuth = optionalAuth;
