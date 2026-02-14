const pool = require("../lib/db");

async function findAll() {
  const [rows] = await pool.query(
    "SELECT node_url, last_sync_at FROM node_registry"
  );
  return rows;
}

async function updateLastSync(nodeUrl) {
  await pool.query(
    `
    UPDATE node_registry
    SET last_sync_at = NOW()
    WHERE node_url = ?
    `,
    [nodeUrl]
  );
}

async function create(nodeUrl) {
  await pool.query(
    `
    INSERT INTO node_registry (node_url)
    VALUES (?)
    ON DUPLICATE KEY UPDATE node_url = node_url
    `,
    [nodeUrl]
  );
}

module.exports = {
  findAll,
  updateLastSync,
  create
};
