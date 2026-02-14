const pool = require("../lib/db");

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    amount: Number(row.amount),
    status: row.status,
    buyerRated: !!row.buyer_rated,
    sellerRated: !!row.seller_rated,
    ratingGiven: !!row.rating_given,
    escrowLocked: !!row.escrow_locked,
    escrowReleasedAt: row.escrow_released_at ? new Date(row.escrow_released_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,

    lastPing: row.last_ping ? new Date(row.last_ping).toISOString() : null,
    pingCount: row.ping_count ?? 0,
    dialogNotes: row.dialog_notes ?? "",
    dialogConfirmed: !!row.dialog_confirmed,
    flaggedForReview: !!row.flagged_for_review
  };
}

async function create(tx) {
  // defaults defensivos
  const payload = {
    status: "pending",
    buyerRated: false,
    sellerRated: false,
    ratingGiven: false,
    escrowLocked: true,
    ...tx
  };

  await pool.query(
    `
    INSERT INTO transactions (
      id, buyer_id, seller_id, listing_id, listing_title, amount,
      status, buyer_rated, seller_rated, rating_given,
      escrow_locked, escrow_released_at,
      last_ping, ping_count, dialog_notes, dialog_confirmed, flagged_for_review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.id,
      payload.buyerId,
      payload.sellerId,
      payload.listingId || null,
      payload.listingTitle || null,
      payload.amount,
      payload.status,
      payload.buyerRated ? 1 : 0,
      payload.sellerRated ? 1 : 0,
      payload.ratingGiven ? 1 : 0,
      payload.escrowLocked ? 1 : 0,
      payload.escrowReleasedAt ? new Date(payload.escrowReleasedAt) : null,
      payload.lastPing ? new Date(payload.lastPing) : null,
      payload.pingCount ?? 0,
      payload.dialogNotes ?? null,
      payload.dialogConfirmed ? 1 : 0,
      payload.flaggedForReview ? 1 : 0
    ]
  );

  return payload;
}

async function findById(id) {
  if (!id) {
    const err = new Error("Transaction id required");
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await pool.query(`SELECT * FROM transactions WHERE id = ? LIMIT 1`, [id]);
  return mapRow(rows[0]);
}

async function findAll() {
  const [rows] = await pool.query(`SELECT * FROM transactions ORDER BY created_at DESC`);
  return rows.map(mapRow);
}

async function updateDialog(transactionId, dialogNotes, dialogConfirmed, flaggedForReview) {
  const [res] = await pool.query(
    `
    UPDATE transactions
    SET dialog_notes = ?,
        dialog_confirmed = ?,
        flagged_for_review = ?
    WHERE id = ?
    `,
    [dialogNotes ?? null, dialogConfirmed ? 1 : 0, flaggedForReview ? 1 : 0, transactionId]
  );

  if (res.affectedRows === 0) {
    const err = new Error("Transaction not found");
    err.statusCode = 404;
    throw err;
  }

  return findById(transactionId);
}

async function ping(transactionId) {
  const [res] = await pool.query(
    `
    UPDATE transactions
    SET last_ping = NOW(),
        ping_count = ping_count + 1
    WHERE id = ?
    `,
    [transactionId]
  );

  if (res.affectedRows === 0) {
    const err = new Error("Transaction not found");
    err.statusCode = 404;
    throw err;
  }

  return findById(transactionId);
}

// concorrencia "real" via UPDATE condicional
async function markBuyerRated(id) {
  const [res] = await pool.query(
    `UPDATE transactions SET buyer_rated = 1 WHERE id = ? AND buyer_rated = 0`,
    [id]
  );
  if (res.affectedRows === 0) {
    const err = new Error("Rating already submitted");
    err.statusCode = 409;
    throw err;
  }
}

async function markSellerRated(id) {
  const [res] = await pool.query(
    `UPDATE transactions SET seller_rated = 1 WHERE id = ? AND seller_rated = 0`,
    [id]
  );
  if (res.affectedRows === 0) {
    const err = new Error("Rating already submitted");
    err.statusCode = 409;
    throw err;
  }
}

async function markRated(transactionId) {
  const [res] = await pool.query(
    `
    UPDATE transactions
    SET rating_given = 1
    WHERE id = ?
      AND buyer_rated = 1
      AND seller_rated = 1
      AND rating_given = 0
    `,
    [transactionId]
  );
  
  return res.affectedRows;
}

async function finalizeIfBothRated(id) {
  const [result] = await pool.query(
    `
    UPDATE transactions
    SET rating_given = 1,
        status = 'completed'
    WHERE id = ?
      AND buyer_rated = 1
      AND seller_rated = 1
      AND rating_given = 0
    `,
    [id]
  );

  return result.affectedRows;
}

async function releaseIfLocked(transactionId) {
  const [res] = await pool.query(
    `
    UPDATE transactions
    SET escrow_locked = 0,
        escrow_released_at = NOW()
    WHERE id = ?
      AND escrow_locked = 1
      AND buyer_rated = 1
      AND seller_rated = 1
    `,
    [transactionId]
  );

  return res.affectedRows;
}

module.exports = {
  create,
  findById,
  findAll,
  updateDialog,
  ping,
  markBuyerRated,
  markSellerRated,
  markRated,
  finalizeIfBothRated,
  releaseIfLocked
};
