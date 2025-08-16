import { Context } from "grammy";
import { redis } from "../services/redis.js";
import { FlomoAPI } from "../services/flomo.js";
import { NotionAPI } from "../services/notion.js";


export class CallbackHandler {
    constructor(private flomo: FlomoAPI, private notion: NotionAPI) { }

    async handleCallback(ctx: Context) {
        if (!ctx.callbackQuery?.data) return;

        console.log(`🔍 [CallbackHandler] 处理回调: ${ctx.callbackQuery.data}`);

        try {
            const data = JSON.parse(ctx.callbackQuery.data);
            if (data.a !== "save") return;

            const text = await redis.get(`task:${data.t}:result`);
            if (!text) throw new Error("结果已过期或不存在");

            console.log(`🔍 [CallbackHandler] 开始保存到 ${data.to}, 文本长度: ${text.length}`);

            if (data.to === "flomo") {
                await this.flomo.save(text, ctx.from!.id);
                console.log(`✅ [CallbackHandler] Flomo保存成功`);
                await this.sendReplyWithRetry(ctx, '已保存到你的flomo中');
            }

            if (data.to === "notion") {
                await this.notion.save(text, ctx.from!.id);
                console.log(`✅ [CallbackHandler] Notion保存成功`);
                await this.sendReplyWithRetry(ctx, '已保存到Notion中');
            }

            await this.answerCallbackQueryWithRetry(ctx, `已保存到 ${data.to}`);
            console.log(`✅ [CallbackHandler] 回调处理完成`);
        } catch (e: any) {
            console.error(`❌ [CallbackHandler] 回调处理失败:`, e);
            await this.answerCallbackQueryWithRetry(ctx, e.message ?? "处理失败");
        }
    }

    private async sendReplyWithRetry(ctx: Context, text: string, maxRetries: number = 3): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await ctx.reply(text);
                return;
            } catch (error: any) {
                console.error(`❌ [CallbackHandler] 发送回复失败 (尝试 ${attempt}/${maxRetries}):`, error?.message || error);

                if (attempt === maxRetries) {
                    throw error;
                }

                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`🔍 [CallbackHandler] 等待 ${waitTime}ms 后重试回复...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    private async answerCallbackQueryWithRetry(ctx: Context, text: string, maxRetries: number = 3): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await ctx.answerCallbackQuery({ text });
                return;
            } catch (error: any) {
                console.error(`❌ [CallbackHandler] 回答回调查询失败 (尝试 ${attempt}/${maxRetries}):`, error?.message || error);

                if (attempt === maxRetries) {
                    throw error;
                }

                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`🔍 [CallbackHandler] 等待 ${waitTime}ms 后重试回调查询...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
}