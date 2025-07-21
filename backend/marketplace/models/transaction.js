// DynamoDB: No schema or model definitions needed.
// This file provides the table name and a helper for building transaction items for DynamoDB.

const TRANSACTION_TABLE_NAME = "Transactions";

/**
 * Helper to create a transaction item for DynamoDB.
 * @param {Object} params
 * @param {string} id - Unique ID for the transaction (partition key)
 * @param {string} buyerId
 * @param {string} sellerId
 * @param {string} listingId
 * @param {string} status - "pending" or "completed"
 * @param {string} createdAt - ISO string, e.g., new Date().toISOString()
 * @param {boolean} ratingGiven
 * @returns {Object}
 */
function createTransactionItem({
  id,
  buyerId,
  sellerId,
  listingId,
  status = "pending",
  createdAt = new Date().toISOString(),
  ratingGiven = false
}) {
  return {
    id,         // Partition key for DynamoDB table
    buyerId,
    sellerId,
    listingId,
    status,
    createdAt,
    ratingGiven
  };
}

module.exports = {
  TRANSACTION_TABLE_NAME,
  createTransactionItem
};
