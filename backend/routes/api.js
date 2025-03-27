const Notification = require("../models/Notification");

await Notification.create({
  userId: transaction.buyerId,
  message: `Your transaction ${transaction._id} has been initiated.`
});
