const pool = require("../lib/db");

async function findAll() {
  const [rows] = await pool.query(
    `SELECT node_url, last_sync_at FROM node_registry ORDER BY created_at ASC`
  );
  return rows;
}

async function upsertNode(nodeUrl) {
  const [result] = await pool.query(
    `
    INSERT INTO node_registry (node_url)
    VALUES (?)
    ON DUPLICATE KEY UPDATE node_url = VALUES(node_url)
    `,
    [nodeUrl]
  );
  return result;
}

async function updateLastSyncAt(nodeUrl) {
  const [result] = await pool.query(
    `
    UPDATE node_registry
    SET last_sync_at = NOW()
    WHERE node_url = ?
    `,
    [nodeUrl]
  );
  return result.affectedRows;
}

module.exports = {
  findAll,
  upsertNode,
  updateLastSyncAt
};
