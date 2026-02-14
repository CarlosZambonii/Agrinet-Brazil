const listingRepository = require("../repositories/listingRepository");
const transactionRepository = require("../repositories/transactionRepository");
const userRepository = require("../repositories/userRepository");

async function importFederatedData(data) {
  for (const listing of data.listings || []) {
    await listingRepository.upsert(listing);
  }

  for (const transaction of data.transactions || []) {
    await transactionRepository.upsert(transaction);
  }

  for (const user of data.users || []) {
    await userRepository.upsert(user);
  }

  return { success: true };
}

module.exports = { importFederatedData };
