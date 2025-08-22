
import { redis } from "./redis.js";
export type Phase = "OCR" | "DEEPSEEK" | "SENDING" | "IDLE" | "WEB_LINK";

const key = (uid: number) => `u:${uid}:task`;

export async function markBusy(userId: number, taskId: string, phase: Phase) {
    const now = Date.now();
    await redis.hset(key(userId), {
        state: "BUSY",
        taskId,
        phase,
        startedAt: await redis.hget(key(userId), "startedAt") ?? String(now),
        lastBeat: String(now),
    });
    await redis.expire(key(userId), 60 * 10);


}

export async function heartbeat(userId: number) {
    await redis.hset(key(userId), { lastBeat: String(Date.now()) });
    await redis.expire(key(userId), 60 * 10);

}

export async function clearBusy(userId: number) {
    await redis.del(key(userId));
}

export async function getUserBusy(userId: number) {
    const h = await redis.hgetall(key(userId));
    if (!h || !h.state) return { busy: false as const };
    return {
        busy: true as const,
        taskId: h.taskId,
        phase: (h.phase ?? "OCR") as Phase,
        startedAt: Number(h.startedAt ?? Date.now()),
        lastBeat: Number(h.lastBeat ?? Date.now()),
    }
}