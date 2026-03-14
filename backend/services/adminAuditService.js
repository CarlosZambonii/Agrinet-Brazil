const { randomUUID } = require("crypto");
const pool = require("../lib/db");

async function logAdminAction(adminId, action, targetType, targetId, meta = null) {

  await pool.query(
    `
    INSERT INTO admin_actions (
      id,
      admin_id,
      action,
      target_type,
      target_id,
      meta
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      adminId,
      action,
      targetType,
      targetId,
      meta ? JSON.stringify(meta) : null
    ]
  );

}

module.exports = { logAdminAction };
