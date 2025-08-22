import { InlineKeyboard } from "grammy";
import { redis } from "./redis.js";
import { splitTextIntoChunks } from "../utils/chunk.js";

export class ResultHandler {
    constructor(private api: any) { }


    async cacheResult(taskId: string, text: string) {
        await redis.setex(`task:${taskId}:result`, 60 * 60 * 24, text);
    }

    async sendResultToUser(chatId: number, text: string, taskId: string, type: "TEXT" | "OCR" | "WEB_LINK") {
        console.log(`🔍 [ResultHandler] 开始发送结果: chatId=${chatId}, taskId=${taskId}, type=${type}`);
        console.log(`🔍 [ResultHandler] 结果长度: ${text.length}`);

        try {
            const chunks = splitTextIntoChunks(text);
            console.log(`🔍 [ResultHandler] 分割为 ${chunks.length} 个片段`);

            const kb = new InlineKeyboard()
                .text("📝 保存到Flomo", JSON.stringify({ a: "save", t: taskId, to: "flomo" }))
                .text("📘 保存到Notion", JSON.stringify({ a: "save", t: taskId, to: "notion" }));

            for (let i = 0; i < chunks.length; i++) {
                const isLast = i === chunks.length - 1;
                console.log(`🔍 [ResultHandler] 发送第 ${i + 1}/${chunks.length} 个片段`);

                // 添加重试机制的Telegram API调用
                const chunk = chunks[i];
                if (chunk) {
                    await this.sendMessageWithRetry(chatId, chunk, { reply_markup: isLast ? kb : undefined }, 3);
                }
                console.log(`🔍 [ResultHandler] 第 ${i + 1} 个片段发送完成`);

                // 如果有多个片段，在发送间隔稍微等待
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            await this.cacheResult(taskId, text);
            console.log(`🔍 [ResultHandler] 结果缓存完成`);
        } catch (error) {
            console.error("❌ [ResultHandler] 发送结果失败:", error);
            // 即使发送失败，也尝试发送一个简单的错误提示
            try {
                await this.sendMessageWithRetry(chatId, "抱歉，发送结果时遇到网络问题，请稍后重试。", {}, 2);
            } catch (fallbackError) {
                console.error("❌ [ResultHandler] 发送错误提示也失败:", fallbackError);
            }
            throw error;
        }
    }

    private async sendMessageWithRetry(chatId: number, text: string, options: any, maxRetries: number = 3): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.api.sendMessage(chatId, text, options);
                return; // 成功发送，退出重试循环
            } catch (error: any) {
                console.error(`❌ [ResultHandler] 发送消息失败 (尝试 ${attempt}/${maxRetries}):`, error?.message || error);

                if (attempt === maxRetries) {
                    throw error; // 最后一次尝试失败，抛出错误
                }

                // 指数退避：等待时间递增
                const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
                console.log(`🔍 [ResultHandler] 等待 ${waitTime}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
}
