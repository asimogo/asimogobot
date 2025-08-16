import { Context, InlineKeyboard } from "grammy";
import { redis } from "../services/redis.js";
import { FlomoAPI } from "../services/flomo.js";
import { NotionAPI } from "../services/notion.js";

// ---- 辅助：Redis 键 & 归一化 ----
const savedKey = (uid: number, taskId: string) => `task:${taskId}:saved:u:${uid}`;
const normTo = (to: string): "f" | "n" => (to.toLowerCase().startsWith("f") ? "f" : "n");

// ---- 辅助：生成键盘：根据“已保存状态”来渲染 ----
function buildSaveKB(taskId: string, saved: { f: boolean; n: boolean }) {
    const kb = new InlineKeyboard();
    if (saved.f) kb.text("✅ 已保存到 Flomo", JSON.stringify({ a: "noop" }));
    else kb.text("✅ 保存到 Flomo", JSON.stringify({ a: "save", t: taskId, to: "flomo" }));

    if (saved.n) kb.text("✅ 已保存到 Notion", JSON.stringify({ a: "noop" }));
    else kb.text("📘 保存到 Notion", JSON.stringify({ a: "save", t: taskId, to: "notion" }));

    return kb;
}




export class CallbackHandler {
    constructor(private flomo: FlomoAPI, private notion: NotionAPI) { }

    async handleCallback(ctx: Context) {
        const raw = ctx.callbackQuery?.data;
        if (!raw) return;

        console.log(`🔍 [CallbackHandler] 处理回调: ${raw}`);

        // 1) 安全解析 callback_data（支持 {a:"noop"}）
        let data: any;
        try {
            data = JSON.parse(raw);
        } catch {
            // 不是 JSON，直接忽略
            await this.answerCallbackQueryWithRetry(ctx, "无效的回调数据");
            return;
        }

        // 2) 无操作回调（禁用按钮用）
        if (data.a === "noop") {
            await this.answerCallbackQueryWithRetry(ctx, "已处理");
            return;
        }

        if (data.a !== "save") return;

        const userId = ctx.from!.id;
        const taskId = String(data.t || "");
        const to = normTo(String(data.to || ""));

        // 1) 拉取当前“已保存状态”
        const key = savedKey(userId, taskId);
        const [fSaved0, nSaved0] = await Promise.all([
            redis.sismember(key, "f"),
            redis.sismember(key, "n"),
        ]);
        const alreadySaved = to === "f" ? !!fSaved0 : !!nSaved0;

        const text = await redis.get(`task:${data.t}:result`);
        if (!text) throw new Error("结果已过期或不存在");


        try {


            // const text = await redis.get(`task:${data.t}:result`);
            // if (!text) throw new Error("结果已过期或不存在");

            // console.log(`🔍 [CallbackHandler] 开始保存到 ${data.to}, 文本长度: ${text.length}`);

            // if (data.to === "flomo") {
            //     await this.flomo.save(text, ctx.from!.id);
            //     console.log(`✅ [CallbackHandler] Flomo保存成功`);
            //     await this.sendReplyWithRetry(ctx, "✅已保存到你的 Flomo 中");
            // } else if (data.to === "notion") {
            //     await this.notion.save(text, ctx.from!.id);
            //     console.log(`✅ [CallbackHandler] Notion保存成功`);
            //     await this.sendReplyWithRetry(ctx, "✅已保存到 Notion 中");
            // } else {
            //     throw new Error("未知的保存目标");
            // }

            // // 3) 更新当前消息的内联键盘
            // //    点击了哪个，就把哪个变成“已保存”，另一个仍可点击
            // const kb = new InlineKeyboard();
            // if (data.to === "flomo") {
            //     kb.text("✅ 已保存到Flomo", JSON.stringify({ a: "noop" }))
            //         .text("保存到Notion", JSON.stringify({ a: "save", t: data.t, to: "notion" }));
            // } else {
            //     kb.text("保存到Flomo", JSON.stringify({ a: "save", t: data.t, to: "flomo" }))
            //         .text("✅ 已保存到Notion", JSON.stringify({ a: "noop" }));
            // }
            // await ctx.editMessageReplyMarkup({ reply_markup: kb });

            // await this.answerCallbackQueryWithRetry(ctx, `✅ 已保存到 ${data.to}`);
            // console.log(`✅ [CallbackHandler] 回调处理完成`);

            await ctx.answerCallbackQuery({ text: to === "f" ? "正在保存到 Flomo…" : "正在保存到 Notion…" });

            if (!alreadySaved) {
                if (to === "f") {
                    await this.flomo.save(text, ctx.from!.id);
                } else {
                    await this.notion.save(text, ctx.from!.id);
                }
                await redis.sadd(key, to);
                // 可选：跟结果缓存同寿命
                await redis.expire(key, 60 * 60 * 24);
            }

            // 3) 重新读取真实状态 → 重建键盘（不会“清掉”先前的 noop）
            const [fSaved, nSaved] = await Promise.all([
                redis.sismember(key, "f"),
                redis.sismember(key, "n"),
            ]).then(([f, n]) => [!!f, !!n]);

            // 都保存了？你可以选择 A) 两个都置为“✅ 已保存”，或 B) 直接移除键盘/删除消息
            if (fSaved && nSaved) {
                // A) 显示都已保存（保留键盘只读）
                await ctx.editMessageReplyMarkup({ reply_markup: buildSaveKB(taskId, { f: true, n: true }) });

                // B 可选) 直接移除键盘
                // await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

                // C 可选) 直接删除整条消息（需在 48h 内）
                // await ctx.deleteMessage();
            } else {
                await ctx.editMessageReplyMarkup({ reply_markup: buildSaveKB(taskId, { f: fSaved, n: nSaved }) });
            }

            // 提示
            if (!alreadySaved) {
                await ctx.reply(to === "f" ? "✅ 已保存到你的 Flomo" : "✅ 已保存到 Notion", {
                    reply_parameters: ctx.callbackQuery?.message?.message_id
                        ? { message_id: ctx.callbackQuery.message.message_id }
                        : undefined,
                });
            } else {
                await ctx.answerCallbackQuery({ text: "已保存过啦" });
            }
        } catch (e: any) {
            console.error(`❌ [CallbackHandler] 回调处理失败:`, e);
            await this.answerCallbackQueryWithRetry(ctx, e?.message ?? "处理失败");
        }
    }

    private async sendReplyWithRetry(ctx: Context, text: string, maxRetries = 3): Promise<void> {
        // ✅ 在 callback_query 场景，优先回复到原消息
        const replyTo =
            (ctx.callbackQuery && "message" in ctx.callbackQuery && ctx.callbackQuery.message?.message_id)
                ? { reply_parameters: { message_id: ctx.callbackQuery.message!.message_id } }
                : (ctx.msg?.message_id ? { reply_parameters: { message_id: ctx.msg.message_id } } : {});

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await ctx.reply(text, replyTo);
                return;
            } catch (error: any) {
                console.error(`❌ [CallbackHandler] 发送回复失败 (尝试 ${attempt}/${maxRetries}):`, error?.message || error);
                if (attempt === maxRetries) throw error;

                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`🔍 [CallbackHandler] 等待 ${waitTime}ms 后重试回复...`);
                await new Promise((r) => setTimeout(r, waitTime));
            }
        }
    }

    private async answerCallbackQueryWithRetry(ctx: Context, text: string, maxRetries = 3): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await ctx.answerCallbackQuery({ text });
                return;
            } catch (error: any) {
                console.error(`❌ [CallbackHandler] 回答回调查询失败 (尝试 ${attempt}/${maxRetries}):`, error?.message || error);
                if (attempt === maxRetries) throw error;

                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`🔍 [CallbackHandler] 等待 ${waitTime}ms 后重试回调查询...`);
                await new Promise((r) => setTimeout(r, waitTime));
            }
        }
    }
}