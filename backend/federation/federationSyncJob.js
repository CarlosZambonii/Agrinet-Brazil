const axios = require("axios");
const dynamodbClient = require("../lib/dynamodbClient");
const { NODE_REGISTRY_TABLE_NAME } = require("./models/nodeRegistry");

const runFederationSync = async () => {
  const { Items: nodes } = await dynamodbClient
    .scan({ TableName: NODE_REGISTRY_TABLE_NAME })
    .promise();

  for (const node of nodes) {
    try {
      const { data } = await axios.get(`${node.url}/export`);

      await axios.post("http://localhost:5000/import", data);

      await dynamodbClient
        .update({
          TableName: NODE_REGISTRY_TABLE_NAME,
          Key: { url: node.url },
          UpdateExpression: "set lastSyncAt = :time",
          ExpressionAttributeValues: {
            ":time": new Date().toISOString(),
          },
        })
        .promise();

      console.log(`✅ Synced with ${node.url}`);
    } catch (err) {
      console.error(`❌ Failed to sync with ${node.url}`);
    }
  }
};

// Run every 6 hours
setInterval(runFederationSync, 6 * 60 * 60 * 1000); // 6 hours

module.exports = runFederationSync;
