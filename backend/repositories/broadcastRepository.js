const pool = require("../lib/db");
const { v4: uuidv4 } = require("uuid");

async function create({ type, payload }) {
  const id = uuidv4();

  await pool.query(
    `INSERT INTO broadcasts (id, type, payload) VALUES (?, ?, ?)`,
    [id, type, JSON.stringify(payload)]
  );

  return { id, type, payload };
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT * FROM broadcasts ORDER BY created_at DESC`
  );

  return rows;
}

module.exports = {
  create,
  findAll
};
