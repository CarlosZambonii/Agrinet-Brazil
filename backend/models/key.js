// DynamoDB does not require a schema or model definition like Mongoose.
// Use this file to export the table name and provide a helper for building key items if desired.

const KEY_TABLE_NAME = "Keys";

// Helper function to build a key item for DynamoDB
function createKeyItem({
  id, // You should generate a unique id for each key (e.g., uuid)
  userId,
  key,
  issuedAt = new Date().toISOString(),
  usageCount = 0,
  expiresAt // should be an ISO string
}) {
  return {
    id, // Partition key for DynamoDB table
    userId,
    key,
    issuedAt,
    usageCount,
    expiresAt
  };
}

module.exports = {
  KEY_TABLE_NAME,
  createKeyItem
};
