require("dotenv").config({ path: __dirname + "/../.env" });

const axios = require("axios");
const nodeRegistryRepository = require("../repositories/nodeRegistryRepository");
const { federationSyncSuccess, federationSyncFail } = require("../lib/metrics");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const syncFromPeers = async () => {
  try {
    const nodes = await nodeRegistryRepository.findAll();
    const selfUrl = process.env.NODE_URL;

    for (const node of nodes) {
      if (!node.node_url) continue;

      if (node.node_url === selfUrl) {
        console.log(`⏭ Skipping self node: ${node.node_url}`);
        continue;
      }

      try {
        console.log(`🌐 Syncing from ${node.node_url}`);

        const res = await axios.get(`${node.node_url}/federation/export`, {
          headers: {
            "x-api-key": process.env.API_KEY
          },
          timeout: 10000
        });

        const payload = res.data;

        await axios.post(
          `${node.node_url}/federation/import`,
          payload,
          {
            headers: {
              "x-api-key": process.env.API_KEY
            },
            timeout: 10000
          }
        );

        await nodeRegistryRepository.updateLastSyncAt(node.node_url);

        federationSyncSuccess.inc();
        console.log(`✔ Synced from ${node.node_url}`);

      } catch (err) {
        federationSyncFail.inc();
        console.log(`❌ Sync failed for ${node.node_url}: ${err.message}`);
      }
    }
  } catch (err) {
    federationSyncFail.inc();
    console.error("❌ Federation sync error:", err.message);
  }
};

const start = async () => {
  console.log("🌐 Federation sync worker started");

  while (true) {
    await syncFromPeers();
    await sleep(60000); // 1 minuto
  }
};

if (require.main === module) {
  start();
}

module.exports = { syncFromPeers };