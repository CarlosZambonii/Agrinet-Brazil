const axios = require("axios");
const pool = require("../lib/db");

const peers = [
  "http://node-br.marketplace:5000",
  "http://node-us.marketplace:5000",
  "http://node-eu.marketplace:5000"
];

async function federatedSearch(query) {

  const [localListings] = await pool.query(
    `
    SELECT id,title,price,city,state
    FROM listings
    WHERE status='active'
    LIMIT 20
    `
  );

  const results = [...localListings];

  for (const peer of peers) {

    try {

      const res = await axios.get(`${peer}/search`, {
        params: query,
        timeout: 2000
      });

      results.push(...res.data);

    } catch (err) {

      console.log("Peer search failed:", peer);

    }

  }

  return results;

}

module.exports = {
  federatedSearch
};
