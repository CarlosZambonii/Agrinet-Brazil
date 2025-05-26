const Notification = require("../models/Notification");
const { addPingJob } = require('../bull/pingJobs');

// Example: wrapping in an Express route handler
router.post('/your-route', async (req, res) => {
  try {
    // ...other logic, e.g. creating transaction object
    const transaction = /* your transaction logic here */;
    const newTransaction = /* your newTransaction logic here */;

    await Notification.create({
      userId: transaction.buyerId,
      message: `Your transaction ${transaction._id} has been initiated.`
    });

    await newTransaction.save();
    addPingJob(newTransaction._id);

    res.status(201).json({ message: 'Transaction and notification created.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
