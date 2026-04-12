require('dotenv').config();
const { Worker } = require("bullmq");

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  maxRetriesPerRequest: null,
};

const worker = new Worker(
  "jobs",
  async (job) => {
    console.log(`[jobWorker] processando job ${job.id} (${job.name}):`, job.data);

    if (job.name === "send_email") {
      console.log("Sending email to:", job.data.email);
    }

    if (job.name === "notification") {
      console.log("Notify user:", job.data.userId);
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`[jobWorker] job ${job.id} (${job.name}) concluído`);
});

worker.on("failed", (job, err) => {
  console.error(`[jobWorker] job ${job?.id} falhou:`, err.message);
});

console.log('[jobWorker] aguardando jobs na fila "jobs"...');
