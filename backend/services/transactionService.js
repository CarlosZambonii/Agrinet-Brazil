const { randomUUID } = require("crypto");
const transactionRepository = require("../repositories/transactionRepository");
const { createTransactionItem } = require("../marketplace/models/transaction");
const { calculateFraudScore } = require("./fraudService");
const userRepository = require("../repositories/userRepository");
const walletRepository = require("../repositories/walletRepository");
const pool = require("../lib/db");
const {
  agrinet_rating_total,
  agrinet_rating_conflict_total,
  fraudFlagTotal,
  fraudBlockTotal
} = require("../lib/metrics");

async function createTransactionWithWalletDebit(payload) {
  const numericAmount = Number(payload.amount);
  const buyerId = payload.buyerId;
  const sellerId = payload.sellerId;

  if (!buyerId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    const err = new Error("buyerId and valid positive amount required");
    err.statusCode = 400;
    throw err;
  }

  if (!sellerId) {
    const err = new Error("sellerId required");
    err.statusCode = 400;
    throw err;
  }

  if (buyerId === sellerId) {
    const err = new Error("Buyer cannot be the seller");
    err.statusCode = 400;
    throw err;
  }

  const buyer = await userRepository.findById(buyerId);
  if (!buyer) {
    const err = new Error("Buyer does not exist");
    err.statusCode = 404;
    throw err;
  }

  const seller = await userRepository.findById(sellerId);
  if (!seller) {
    const err = new Error("Seller does not exist");
    err.statusCode = 404;
    throw err;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 🔒 Debit using SAME connection
    await walletRepository.debit(
      buyerId,
      numericAmount,
      `Purchase: ${payload.listingTitle || ""}`.trim(),
      null,
      connection
    );

    const id = randomUUID();

    const item = createTransactionItem({
      ...payload,
      id,
      amount: numericAmount,
      escrowLocked: true,
      status: "pending"
    });

    const fraudScore = await calculateFraudScore(
      buyerId,
      sellerId,
      numericAmount
    );
    const flagged = fraudScore >= 60 ? 1 : 0;
    if (flagged === 1) {
      fraudFlagTotal.inc();
    }

    // Insert transaction using same connection
    await connection.query(
      `INSERT INTO transactions SET ?`,
      {
        id: item.id,
        buyer_id: item.buyerId,
        seller_id: item.sellerId,
        listing_id: item.listingId,
        listing_title: item.listingTitle,
        amount: item.amount,
        status: item.status,
        buyer_rated: 0,
        seller_rated: 0,
        rating_given: 0,
        escrow_locked: 1,
        fraud_score: fraudScore,
        flagged_for_review: flagged,
        created_at: new Date()
      }
    );

    await connection.commit();
    const { transactionsCreated } = require("../lib/metrics");
    transactionsCreated.inc();

    return { message: "Transaction initiated and wallet debited", transaction: item };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function releaseEscrow(transactionId) {
  const { escrowReleaseSuccess, escrowReleaseConflict } = require("../lib/metrics");

  if (!transactionId) {
    const err = new Error("Transaction id required");
    err.statusCode = 400;
    throw err;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Lock row first (get seller + amount safely)
    const [rows] = await connection.query(
      `SELECT seller_id, amount, listing_title, flagged_for_review
       FROM transactions
       WHERE id = ?
       FOR UPDATE`,
      [transactionId]
    );

    if (!rows.length) {
      const err = new Error("Transaction not found");
      err.statusCode = 404;
      throw err;
    }

    const tx = rows[0];
    if (tx.flagged_for_review === 1) {
      fraudBlockTotal.inc();
      const err = new Error("Transaction under review");
      err.statusCode = 409;
      throw err;
    }

    // 2️⃣ Atomic conditional update
    const [updateResult] = await connection.query(
      `
      UPDATE transactions
      SET escrow_locked = 0,
          escrow_released_at = NOW(),
          status = 'completed',
          rating_given = 1
      WHERE id = ?
        AND status = 'pending'
        AND escrow_locked = 1
        AND buyer_rated = 1
        AND seller_rated = 1
        AND flagged_for_review = 0
        AND rating_given = 0
      `,
      [transactionId]
    );

    if (updateResult.affectedRows === 0) {
      escrowReleaseConflict.inc();
      const err = new Error("Escrow cannot be released");
      err.statusCode = 409;
      throw err;
    }

    // 3️⃣ Credit seller in SAME transaction
    await walletRepository.credit(
      tx.seller_id,
      Number(tx.amount),
      `Sale: ${tx.listing_title || ""}`,
      transactionId,
      connection
    );

    await connection.commit();
    escrowReleaseSuccess.inc();

    return { message: "Escrow released successfully" };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function rateTransaction(transactionId, rating, userId) {
  const numericRating = Number(rating);
  const transaction = await transactionRepository.findById(transactionId);

  if (transaction && transaction.ratingGiven) {
    const err = new Error("Transaction already finalized");
    err.statusCode = 409;
    throw err;
  }

  if (transaction && transaction.status === "completed") {
    const err = new Error("Transaction already finalized");
    err.statusCode = 409;
    throw err;
  }

  if (!Number.isFinite(numericRating) || numericRating < -1 || numericRating > 4) {
    const err = new Error("Invalid rating value. Must be between -1 and 4.");
    err.statusCode = 400;
    throw err;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT * FROM transactions WHERE id = ? FOR UPDATE`,
      [transactionId]
    );

    if (!rows.length) {
      const err = new Error("Transaction not found");
      err.statusCode = 404;
      throw err;
    }

    const tx = rows[0];
    let actorRole;
    if (tx.buyer_id === userId) {
      actorRole = "buyer";
    } else if (tx.seller_id === userId) {
      actorRole = "seller";
    } else {
      const err = new Error("User not part of this transaction");
      err.statusCode = 403;
      throw err;
    }

    if (tx.flagged_for_review === 1) {
      fraudBlockTotal.inc();
      const err = new Error("Transaction under review");
      err.statusCode = 409;
      throw err;
    }

    if (tx.rating_given === 1) {
      const err = new Error("Transaction already finalized");
      err.statusCode = 409;
      throw err;
    }

    // prevent double rating
    if (actorRole === "buyer" && tx.buyer_rated === 1) {
      const err = new Error("Buyer already rated");
      err.statusCode = 409;
      throw err;
    }

    if (actorRole === "seller" && tx.seller_rated === 1) {
      const err = new Error("Seller already rated");
      err.statusCode = 409;
      throw err;
    }

    // mark rating
    await connection.query(
      actorRole === "buyer"
        ? `UPDATE transactions SET buyer_rated = 1 WHERE id = ?`
        : `UPDATE transactions SET seller_rated = 1 WHERE id = ?`,
      [transactionId]
    );

    const userIdToRate =
      actorRole === "buyer" ? tx.seller_id : tx.buyer_id;

    await connection.query(
      `UPDATE users SET reputation_score = reputation_score + ? WHERE id = ?`,
      [numericRating, userIdToRate]
    );

    // reload updated row
    const [updatedRows] = await connection.query(
      `SELECT * FROM transactions WHERE id = ?`,
      [transactionId]
    );

    const updated = updatedRows[0];

    // if both rated → finalize + release escrow + credit
    if (
      updated.buyer_rated === 1 &&
      updated.seller_rated === 1 &&
      updated.escrow_locked === 1
    ) {
      await walletRepository.credit(
        updated.seller_id,
        Number(updated.amount),
        `Sale: ${updated.listing_title || ""}`,
        transactionId,
        connection
      );
    }

    await connection.commit();
    agrinet_rating_total.inc();

    return { message: "Rating submitted successfully" };

  } catch (err) {
    if (err?.statusCode === 409) {
      agrinet_rating_conflict_total.inc();
    }
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function pingTransaction(transactionId) {
  const result = await transactionRepository.ping(transactionId);

  return {
    message: "Ping recorded",
    pingCount: result.pingCount,
    lastPing: result.lastPing
  };
}

async function resolveFlag(transactionId, action) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT * FROM transactions WHERE id = ?",
      [transactionId]
    );

    if (!rows.length) {
      const err = new Error("Transaction not found");
      err.statusCode = 404;
      throw err;
    }

    const transaction = rows[0];

    if (!transaction.flagged_for_review) {
      const err = new Error("Transaction is not flagged");
      err.statusCode = 400;
      throw err;
    }

    if (action === "approve") {
      await connection.query(
        "UPDATE transactions SET flagged_for_review = 0 WHERE id = ?",
        [transactionId]
      );
    }

    if (action === "cancel") {
      await connection.query(
        `UPDATE transactions 
         SET status = 'cancelled',
             escrow_locked = 0,
             flagged_for_review = 0
         WHERE id = ?`,
        [transactionId]
      );
    }

    await connection.commit();

    return { message: "Flag resolved" };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  createTransactionWithWalletDebit,
  releaseEscrow,
  pingTransaction,
  rateTransaction,
  resolveFlag
};
