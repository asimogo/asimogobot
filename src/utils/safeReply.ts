import type { Context } from "grammy";

const MAX_LEN = 4000; // 留余量，低于 Telegram 4096 上限

export async function safeReply(ctx: Context, text: string, opts?: Parameters<typeof ctx.reply>[1]) {
    if (!text) return;
    // 简单兜底：避免 Markdown 实体引起的“不可见”超长
    const useMarkdown = opts?.parse_mode === "Markdown" || opts?.parse_mode === "MarkdownV2";
    const body = useMarkdown ? text : text;

    if (body.length <= MAX_LEN) {
        return ctx.reply(body, opts);
    }
    const chunks = body.match(new RegExp(`[^]{1,${MAX_LEN}}`, "g")) ?? [];
    for (const part of chunks) {
        // 分片发送时，建议去掉 parse_mode，减少 Markdown 解析踩坑
        const { parse_mode, ...restOpts } = opts || {};
        await ctx.reply(part, restOpts);
    }
}
