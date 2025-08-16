import { resolve } from "path";
import { redis } from "../../services/redis.js";
import { type OCRGroupJobData } from "../../types/models.js";
import { TaskQueue } from "../queues.js";

export class MediaGroupHandler {
    constructor(private taskQueue: TaskQueue, private groupTimeoutMs = 2500) {

    }

    private key(groupId: string) { return `mgroup:${groupId}`; }

    async handleMediaGroupPart(
        chatId: number,
        userId: number,
        groupId: string,
        fileId: string,
        taskId: string) {

        const k = this.key(groupId);
        await redis.rpush(k, fileId);
        await redis.expire(k, 120);

        const lockKey = `${k}:timer`;
        const exists = await redis.set(lockKey, "1", "EX", Math.ceil(this.groupTimeoutMs / 1000), "NX");

        if (exists) {
            setTimeout(async () => {
                const files = await redis.lrange(k, 0, -1);
                if (files.length) {
                    await this.taskQueue.add("ocr-media-group", <OCRGroupJobData>{ taskId, chatId, userId, groupId, fileIds: files, }, { jobId: `ocr-group:${groupId}` });
                    await redis.del(k);
                }
            }, this.groupTimeoutMs);
        }


    }
}