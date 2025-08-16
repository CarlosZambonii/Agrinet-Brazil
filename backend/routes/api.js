const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Notification = require('../models/notifications');
const { addPingJob } = require('../bull/pingJobs');
const docClient = require('../lib/dynamodbClient');
const { TRANSACTION_TABLE_NAME } = require('../models/transaction');

// POST /api/transactions - create a new transaction and send notification
router.post('/transactions', async (req, res) => {
  try {
    const transactionData = req.body;
    const id = crypto.randomUUID();
    const item = { id, ...transactionData };
    await docClient.put({ TableName: TRANSACTION_TABLE_NAME, Item: item }).promise();

    await Notification.create({
      userId: item.buyerId || item.consumerId,
      message: `Your transaction ${id} has been initiated.`
    });

    addPingJob(id);

    res.status(201).json({ message: 'Transaction created and notification sent.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
