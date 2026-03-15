const { createClient } = require("redis");

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = process.env.REDIS_PORT || 6379;

const redis = createClient({
  url: `redis://${redisHost}:${redisPort}`
});

redis.on("error", (err) => {
  console.error("Redis error", err);
});

async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
    console.log(`Redis connected to ${redisHost}:${redisPort}`);
  }
}

module.exports = {
  redis,
  connectRedis
};