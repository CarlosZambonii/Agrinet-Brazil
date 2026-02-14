const jwt = require('../utils/jwt');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Token' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwt');
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

module.exports = authMiddleware;
module.exports.authenticateToken = authenticateToken;
