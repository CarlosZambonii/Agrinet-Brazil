const jobQueue = require("../queues/jobQueue");

async function sendEmail(email) {
  await jobQueue.add("send_email", { email });
}

async function sendNotification(userId) {
  await jobQueue.add("notification", { userId });
}

module.exports = {
  sendEmail,
  sendNotification
};
