const axios = require("axios");
const nodeRepository = require("../repositories/nodeRepository");

const syncFromPeers = async () => {
  try {
    const nodes = await nodeRepository.findAll();

    for (let node of nodes) {
      try {
        const res = await axios.get(`${node.node_url}/federation/export`);
        const { listings, transactions, users } = res.data;

        // Aqui depois vamos integrar com repositories SQL também
        // (por enquanto só valida que comunicação funciona)

        await nodeRepository.updateLastSync(node.node_url);

        console.log(`✔ Synced data from node: ${node.node_url}`);
      } catch (err) {
        console.error(`❌ Federation sync error for node ${node.node_url}:`, err.message);
      }
    }
  } catch (err) {
    console.error("❌ Federation sync error:", err.message);
  }
};

// Example scheduled interval (every 30 mins)
setInterval(syncFromPeers, 30 * 60 * 1000);

module.exports = { syncFromPeers };
