const client = require("prom-client");
const { Counter } = client;

const transactionsCreated = new client.Counter({
  name: "agrinet_transactions_created_total",
  help: "Total transactions created"
});

const escrowReleaseSuccess = new client.Counter({
  name: "agrinet_escrow_release_success_total",
  help: "Total successful escrow releases"
});

const escrowReleaseConflict = new client.Counter({
  name: "agrinet_escrow_release_conflict_total",
  help: "Total failed escrow releases due to conflict"
});

const agrinet_rating_total = new client.Counter({
  name: "agrinet_rating_total",
  help: "Total ratings submitted"
});

const agrinet_rating_conflict_total = new client.Counter({
  name: "agrinet_rating_conflict_total",
  help: "Total rating conflicts"
});

const agrinet_wallet_debit_fail_total = new client.Counter({
  name: "agrinet_wallet_debit_fail_total",
  help: "Total wallet debit failures"
});

const agrinet_wallet_credit_total = new client.Counter({
  name: "agrinet_wallet_credit_total",
  help: "Total wallet credits"
});

const federationSyncSuccess = new client.Counter({
  name: "agrinet_federation_sync_success_total",
  help: "Total successful federation syncs"
});

const federationSyncFail = new client.Counter({
  name: "agrinet_federation_sync_fail_total",
  help: "Total failed federation syncs"
});

const federationImportSuccess = new client.Counter({
  name: "agrinet_federation_import_success_total",
  help: "Total successful federation imports"
});

const federationImportFail = new client.Counter({
  name: "agrinet_federation_import_fail_total",
  help: "Total failed federation imports"
});

const fraudFlagTotal = new Counter({
  name: "agrinet_fraud_flag_total",
  help: "Total transactions flagged for fraud"
});

const fraudBlockTotal = new Counter({
  name: "agrinet_fraud_block_total",
  help: "Total operations blocked due to fraud"
});

module.exports = {
  transactionsCreated,
  escrowReleaseSuccess,
  escrowReleaseConflict,
  agrinet_rating_total,
  agrinet_rating_conflict_total,
  agrinet_wallet_debit_fail_total,
  agrinet_wallet_credit_total,
  federationSyncSuccess,
  federationSyncFail,
  federationImportSuccess,
  federationImportFail,
  fraudFlagTotal,
  fraudBlockTotal,
  register: client.register
};
