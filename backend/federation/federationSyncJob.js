const axios = require("axios");
const NodeRegistry = require("./models/nodeRegistry");

const runFederationSync = async () => {
  const nodes = await NodeRegistry.find();

  for (const node of nodes) {
    try {
      const { data } = await axios.get(`${node.url}/export`);

      await axios.post("http://localhost:5000/import", data);

      node.lastSyncAt = new Date();
      await node.save();

      console.log(`✅ Synced with ${node.url}`);
    } catch (err) {
      console.error(`❌ Failed to sync with ${node.url}`);
    }
  }
};

// Run every 6 hours
setInterval(runFederationSync, 6 * 60 * 60 * 1000); // 6 hours

module.exports = runFederationSync;
