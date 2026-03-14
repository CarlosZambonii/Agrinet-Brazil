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

const fraudBlocked = new Counter({
  name: "agrinet_fraud_block_total",
  help: "Total accounts blocked due to fraud"
});
const fraudBlockTotal = fraudBlocked;

const stripePaymentSucceeded = new client.Counter({
  name: "stripe_payment_succeeded_total",
  help: "Total Stripe successful payments"
});
const stripePaymentSucceededTotal = stripePaymentSucceeded;

const stripePaymentFailed = new client.Counter({
  name: "stripe_payment_failed_total",
  help: "Total Stripe failed payments"
});

const stripeRefundTotal = new client.Counter({
  name: "stripe_refund_total",
  help: "Total Stripe refunds processed"
});

const stripeDuplicateEvent = new client.Counter({
  name: "stripe_webhook_duplicate_total",
  help: "Duplicate Stripe webhook events"
});

const stripeAmountMismatch = new client.Counter({
  name: "stripe_amount_mismatch_total",
  help: "Stripe amount mismatch blocks"
});

const velocityTriggerTotal = new client.Counter({
  name: "velocity_trigger_total",
  help: "Total velocity fraud triggers"
});

const userBlockTotal = new client.Counter({
  name: "user_block_total",
  help: "Total users blocked"
});

const refundTotal = new client.Counter({
  name: "refund_total",
  help: "Total refunds processed"
});

const disputesOpenedTotal = new client.Counter({
  name: "agrinet_disputes_open_total",
  help: "Total disputes opened"
});

const disputesResolvedTotal = new client.Counter({
  name: "agrinet_disputes_resolved_total",
  help: "Total disputes resolved"
});

const failedPaymentTotal = new client.Counter({
  name: "failed_payment_total",
  help: "Total failed payments"
});

const duplicateEventTotal = new client.Counter({
  name: "duplicate_event_total",
  help: "Total duplicate stripe events"
});

const messagesSentTotal = new client.Counter({
  name: "messages_sent_total",
  help: "Total messages sent"
});

const conversationsCreatedTotal = new client.Counter({
  name: "conversations_created_total",
  help: "Total conversations created"
});

const searchQueriesTotal = new client.Counter({
  name: "search_queries_total",
  help: "Total listing searches"
});

const listingsViewedTotal = new client.Counter({
  name: "listings_viewed_total",
  help: "Total listing views"
});

const paymentsTotal = new client.Gauge({
  name: "payments_total",
  help: "Total payments in system"
});

const disputesOpenTotal = new client.Gauge({
  name: "disputes_open_total",
  help: "Open disputes"
});

const activeListingsTotal = new client.Gauge({
  name: "active_listings_total",
  help: "Active listings"
});

const activeUsersTotal = new client.Gauge({
  name: "active_users_total",
  help: "Active users"
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
  fraudBlocked,
  fraudBlockTotal,
  stripePaymentSucceeded,
  stripePaymentSucceededTotal,
  stripePaymentFailed,
  stripeRefundTotal,
  stripeDuplicateEvent,
  stripeAmountMismatch,
  velocityTriggerTotal,
  userBlockTotal,
  refundTotal,
  disputesOpenedTotal,
  disputesOpenTotal,
  disputesResolvedTotal,
  failedPaymentTotal,
  duplicateEventTotal,
  messagesSentTotal,
  conversationsCreatedTotal,
  searchQueriesTotal,
  listingsViewedTotal,
  paymentsTotal,
  activeListingsTotal,
  activeUsersTotal,
  register: client.register
};
