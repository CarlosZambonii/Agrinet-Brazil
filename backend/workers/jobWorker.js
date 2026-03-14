const { Worker } = require("bullmq");

const worker = new Worker(
  "jobs",
  async (job) => {

    if (job.name === "send_email") {
      console.log("Sending email to:", job.data.email);
    }

    if (job.name === "notification") {
      console.log("Notify user:", job.data.userId);
    }

  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379
    }
  }
);

worker.on("completed", (job) => {
  console.log("Job completed:", job.name);
});
