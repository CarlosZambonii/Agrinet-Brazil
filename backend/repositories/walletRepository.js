const pool = require("../lib/db");
const {
  agrinet_wallet_debit_fail_total,
  agrinet_wallet_credit_total
} = require("../lib/metrics");

async function findByUserId(userId) {
  const [rows] = await pool.query(
    "SELECT user_id, balance FROM wallets WHERE user_id = ?",
    [userId]
  );

  return rows[0] || null;
}

async function debit(userId, amount, note, refId = null, externalConnection = null) {
  const connection = externalConnection || await pool.getConnection();
  const isExternal = !!externalConnection;

  try {
    if (!isExternal) {
      await connection.beginTransaction();
    }

    const [rows] = await connection.query(
      "SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE",
      [userId]
    );

    if (!rows.length) {
      throw new Error("Wallet not found");
    }

    const currentBalance = Number(rows[0].balance);

    if (currentBalance < amount) {
      throw new Error("Insufficient balance");
    }

    const newBalance = currentBalance - amount;

    await connection.query(
      "UPDATE wallets SET balance = ? WHERE user_id = ?",
      [newBalance, userId]
    );

    await connection.query(
      "INSERT INTO wallet_history (user_id, type, amount, note, ref_id) VALUES (?, ?, ?, ?, ?)",
      [userId, "purchase", -amount, note, refId]
    );

    if (!isExternal) {
      await connection.commit();
    }

    return newBalance;
  } catch (err) {
    agrinet_wallet_debit_fail_total.inc();
    if (!isExternal) {
      await connection.rollback();
    }
    throw err;
  } finally {
    if (!isExternal) {
      connection.release();
    }
  }
}

async function credit(userId, amount, note, refId = null, externalConnection = null) {
  const connection = externalConnection || await pool.getConnection();
  const isExternal = !!externalConnection;

  try {
    if (!isExternal) {
      await connection.beginTransaction();
    }

    const [rows] = await connection.query(
      "SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE",
      [userId]
    );

    if (!rows.length) {
      throw new Error("Wallet not found");
    }

    const currentBalance = Number(rows[0].balance);
    const newBalance = currentBalance + amount;

    await connection.query(
      "UPDATE wallets SET balance = ? WHERE user_id = ?",
      [newBalance, userId]
    );

    await connection.query(
      "INSERT INTO wallet_history (user_id, type, amount, note, ref_id) VALUES (?, ?, ?, ?, ?)",
      [userId, "sale", amount, note, refId]
    );
    agrinet_wallet_credit_total.inc();

    if (!isExternal) {
      await connection.commit();
    }

    return newBalance;

  } catch (err) {
    if (!isExternal) {
      await connection.rollback();
    }
    throw err;
  } finally {
    if (!isExternal) {
      connection.release();
    }
  }
}

module.exports = {
  findByUserId,
  debit,
  credit
};
