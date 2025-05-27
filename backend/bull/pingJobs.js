const { Queue, Worker } = require('bullmq');
const Transaction = require('../marketplace/models/transaction');

const connection = {
  host: 'localhost', // Change to your Redis host if needed
  port: 6379,        // Change to your Redis port if needed
  maxRetriesPerRequest: null, // REQUIRED for BullMQ
};

const pingQueue = new Queue('ping-deadline', { connection });

const addPingJob = (transactionId) => {
  pingQueue.add('checkPing', { transactionId }, { delay: 24 * 60 * 60 * 1000 }); // 24h delay
};

const worker = new Worker('ping-deadline', async job => {
  const { transactionId } = job.data;
  const transaction = await Transaction.findById(transactionId);

  const now = new Date();
  const pingAge = now - new Date(transaction.lastPing);

  if (pingAge > 3 * 24 * 60 * 60 * 1000) {
    global.io.emit("ping-overdue", {
      transactionId,
      message: "🚨 A transaction has not been updated in 3+ days"
    });
  }
}, { connection });

module.exports = { addPingJob };
