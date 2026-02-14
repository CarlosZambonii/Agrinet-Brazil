const pool = require("../lib/db");

async function create({ id, email }) {
  await pool.query(
    `INSERT INTO users (id, email) VALUES (?, ?)`,
    [id, email]
  );
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, email, reputation_score FROM users WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function incrementReputation(userId, delta) {
  await pool.query(
    `UPDATE users 
     SET reputation_score = reputation_score + ? 
     WHERE id = ?`,
    [delta, userId]
  );
}

module.exports = {
  create,
  findById,
  incrementReputation
};
