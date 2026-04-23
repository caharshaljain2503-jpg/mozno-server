import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;
const isRedisEnabled = Boolean(redisUrl);

const createNoopRedis = () => ({
  status: "disabled",
  async get() {
    return null;
  },
  async set() {
    return "OK";
  },
  async setex() {
    return "OK";
  },
  async del() {
    return 0;
  },
  async call() {
    return null;
  },
  async quit() {
    return "OK";
  },
  on() {},
});

const redis = isRedisEnabled
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      tls: redisUrl.includes("rediss://") ? {} : undefined,
      enableReadyCheck: false,
    })
  : createNoopRedis();

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.error("Redis error", err);
});

if (!isRedisEnabled) {
  console.warn("REDIS_URL missing. Redis-backed features are running in degraded mode.");
}

export default redis;
