const { Queue, Worker } = require('bullmq');
const docClient = require('../lib/dynamodbClient');
const { TRANSACTION_TABLE_NAME } = require('../models/transaction');

const connection = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
};

const pingQueue = new Queue('ping-deadline', { connection });

const addPingJob = (transactionId) => {
  pingQueue.add('checkPing', { transactionId }, { delay: 24 * 60 * 60 * 1000 });
};

const worker = new Worker('ping-deadline', async job => {
  const { transactionId } = job.data;
  const result = await docClient.get({ TableName: TRANSACTION_TABLE_NAME, Key: { id: transactionId } }).promise();
  const transaction = result.Item;
  if (!transaction) return;

  const now = new Date();
  const pingAge = now - new Date(transaction.lastPing);

  if (pingAge > 3 * 24 * 60 * 60 * 1000) {
    global.io.emit('ping-overdue', {
      transactionId,
      message: '🚨 A transaction has not been updated in 3+ days',
    });
  }
}, { connection });

module.exports = { addPingJob };
