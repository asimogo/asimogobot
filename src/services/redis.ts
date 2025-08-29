// src/services/redis.ts
import { Redis } from "ioredis";

export const redis = new Redis("rediss://default:AVfTAAIncDEyY2FmYTgyMzM0ZmY0ZGQ1OTY1NjM2NmVlNWNhNDg2NXAxMjI0ODM@immune-buffalo-22483.upstash.io:6379", {
    maxRetriesPerRequest: null
});
