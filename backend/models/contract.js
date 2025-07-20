// DynamoDB does not require a schema or model definition like Mongoose.
// Use this file to export the table name and provide a helper for building contract items if desired.

const CONTRACT_TABLE_NAME = "Contracts";

// Helper function to build a contract item for DynamoDB
function createContractItem({
  id, // You should generate a unique id for each contract (e.g., uuid)
  producerId,
  type,
  variety,
  category,
  amountNeeded,
  dateNeeded,
  pingRate,
  status = "open",
  progressUpdates = []
}) {
  return {
    id, // Partition key for DynamoDB table
    producerId,
    type,
    variety,
    category,
    amountNeeded,
    dateNeeded, // Should be an ISO string if storing as a string
    pingRate,
    status,
    progressUpdates // Array of { progress, updateTime }
  };
}

module.exports = {
  CONTRACT_TABLE_NAME,
  createContractItem
};
