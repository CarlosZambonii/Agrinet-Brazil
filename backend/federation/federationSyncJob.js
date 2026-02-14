require("dotenv").config({ path: __dirname + "/../.env" });
const axios = require("axios");
const nodeRegistryRepository = require("../repositories/nodeRegistryRepository");
const { federationSyncSuccess, federationSyncFail } = require("../lib/metrics");

const syncFromPeers = async () => {
  try {
    const nodes = await nodeRegistryRepository.findAll();
    const selfUrl = process.env.NODE_URL;

    for (const node of nodes) {
      if (node.node_url === selfUrl) {
        console.log(`⏭ Skipping self node: ${node.node_url}`);
        continue;
      }

      try {
        console.log("DEBUG NODE:", node);
        console.log("DEBUG URL:", `${node.node_url}/federation/export`);
        console.log("SYNC API KEY:", process.env.API_KEY);
        const res = await axios.get(`${node.node_url}/federation/export`, {
          headers: {
            "x-api-key": process.env.API_KEY
          }
        });

        const payload = res.data;

        await axios.post(
          `${node.node_url}/federation/import`,
          payload,
          {
            headers: {
              "x-api-key": process.env.API_KEY
            }
          }
        );

        await nodeRegistryRepository.updateLastSyncAt(node.node_url);
        federationSyncSuccess.inc();

        console.log(`[32m[1m✔ Synced from ${node.node_url}[0m`);
      } catch (err) {
        federationSyncFail.inc();
        console.log(`❌ Sync failed for ${node.node_url}:`, err.message);
      }
    }
  } catch (err) {
    federationSyncFail.inc();
    console.error("[31m[1m❌ Federation sync error:[0m", err.message);
  }
};

module.exports = { syncFromPeers };
