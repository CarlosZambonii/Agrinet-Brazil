const pool = require("../lib/db");

async function expirePendingPayments() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [result] = await connection.query(
      `
      UPDATE payments
      SET status = 'expired'
      WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
      `
    );

    if (result.affectedRows > 0) {
      console.log(`Expired ${result.affectedRows} payments`);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error("Expiration job failed:", err.message);
  } finally {
    connection.release();
  }
}

module.exports = expirePendingPayments;
