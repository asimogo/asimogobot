import type { MyContext } from "../../types/context.js";
import { getUserBusy } from "../../services/user-state.js";
import { getQueueOverview } from "../../queue/queues.js";

export async function statusCommand(ctx: MyContext) {
    const userId = ctx.from?.id;
    if (!userId) return ctx.reply("无法识别用户。");

    const busy = await getUserBusy(userId);
    const { text, ocr } = await getQueueOverview();

    const lines = [
        `你的状态：${busy.busy ? `忙（${busy.phase}）` : "空闲"}`,
        busy.busy ? `任务ID：${busy.taskId}` : "",
        "",
        `text 队列 → waiting ${text.waiting}, active ${text.active}, failed ${text.failed}, completed ${text.completed}`,
        `ocr  队列 → waiting ${ocr.waiting}, active ${ocr.active}, failed ${ocr.failed}, completed ${ocr.completed}`,
    ].filter(Boolean);

    await ctx.reply(lines.join("\n"));
}
