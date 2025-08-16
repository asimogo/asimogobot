// src/bot/bot.ts
import "dotenv/config";
import { Bot } from "grammy";
import type { MyContext } from "../types/context.js";
import { statusCommand } from "./commands/status.js";
import { run, sequentialize } from "@grammyjs/runner";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { TaskQueue } from "../queue/queues.js";
import { MessageReceiver } from "./receivers.js";
import { CallbackHandler } from "./callbacks.js";
import { MediaGroupHandler } from "../queue/processors/media-group.js";


// 回调按钮
import { FlomoAPI } from "../services/flomo.js";
import { NotionAPI } from "../services/notion.js";


const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

// 出站（Telegram API）节流，避免触发平台限速
bot.api.config.use(apiThrottler());

// 初始化队列与处理器
console.log("🔍 [Bot] 初始化TaskQueue...");
console.log("🔍 [Bot] 百度OCR配置检查:");
console.log(`  - BAIDU_APPID: ${process.env.BAIDU_APPID ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`  - BAIDU_SECRET: ${process.env.BAIDU_SECRET ? '✅ 已配置' : '❌ 未配置'}`);

const queue = new TaskQueue(bot.api, process.env.BOT_TOKEN!, {
    deepseekKey: process.env.DEEPSEEK_API_KEY!,
    ...(process.env.BAIDU_APPID && { baiduAppId: process.env.BAIDU_APPID }),
    ...(process.env.BAIDU_SECRET && { baiduSecret: process.env.BAIDU_SECRET }),
});
console.log("🔍 [Bot] TaskQueue创建完成");

console.log("🔍 [Bot] 设置处理器...");
queue.setupProcessors();
console.log("🔍 [Bot] 处理器设置完成");

// 媒体组聚合器：把 handler 放进 ctx.state 供 receiver 调用
const mediaGroup = new MediaGroupHandler(queue, 2500);
bot.use((ctx, next) => {
    ctx.state ||= {}; ctx.state.__mediaGroup = mediaGroup.handleMediaGroupPart.bind(mediaGroup);
    return next();
});

const receiver = new MessageReceiver(queue);

bot.command("start", ctx => ctx.reply("欢迎～ 发送文本或图片开始处理。相册请一次性发送。", { disable_notification: true }));
bot.command("status", statusCommand);

// 统一处理消息入口
bot.on("message", ctx => receiver.handleMessage(ctx));


const callbacks = new CallbackHandler(new FlomoAPI(), new NotionAPI());
bot.on("callback_query:data", ctx => callbacks.handleCallback(ctx));



bot.use(
    sequentialize((ctx) => {
        const chat = ctx.chat?.id.toString();
        const user = ctx.from?.id.toString();
        return [chat, user].filter((con) => con !== undefined);
    }),
);


// 添加全局错误处理
bot.catch((err) => {
    console.error("❌ [Bot] 全局错误处理:", err);

    // 记录错误详情
    if (err.error) {
        console.error("❌ [Bot] 错误详情:", err.error);
    }

    // 如果有上下文，尝试回复用户
    if (err.ctx) {
        try {
            err.ctx.reply("抱歉，系统遇到了一个错误，请稍后重试。").catch(console.error);
        } catch (replyError) {
            console.error("❌ [Bot] 发送错误回复失败:", replyError);
        }
    }
});

console.log("🔍 [Bot] 启动机器人...");
const runner = run(bot);
console.log("✅ [Bot] 机器人启动成功！");

// 处理runner错误
runner.task()?.catch((error) => {
    console.error("❌ [Bot] Runner错误:", error);
});

// 优雅退出（可选）
process.once("SIGINT", () => {
    console.log("🔍 [Bot] 收到 SIGINT 信号，正在停止...");
    if (runner.isRunning()) {
        runner.stop();
    }
});

process.once("SIGTERM", () => {
    console.log("🔍 [Bot] 收到 SIGTERM 信号，正在停止...");
    if (runner.isRunning()) {
        runner.stop();
    }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('❌ [Bot] 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [Bot] 未处理的Promise拒绝:', reason);
    console.error('❌ [Bot] Promise:', promise);
});
