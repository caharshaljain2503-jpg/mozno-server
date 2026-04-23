import { Queue } from "bullmq";
import redis from "../configs/redis.js";

const isRedisAvailable = redis?.status && redis.status !== "disabled";

const emailQueue = isRedisAvailable
  ? new Queue("email-queue", {
      connection: redis,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
        timeout: 30000, // ⏱ prevents stuck jobs
        failParentOnFailure: false,
      },
    })
  : {
      async add() {
        return { id: "noop-email-job" };
      },
    };

export default emailQueue;
