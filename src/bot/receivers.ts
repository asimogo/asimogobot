import { type MyContext } from "../types/context.js";
import { MessageType, ProcessingMode } from "../types/enums.js";
import { TaskQueue, defaultJobOpts } from "../queue/queues.js";
import { getUserBusy } from "../services/user-state.js";
import { tryCatch } from "bullmq";



export class MessageReceiver {
    constructor(private queue: TaskQueue) { }

    generateTaskId() {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }

    classifyMessage(ctx: MyContext): MessageType {
        const m = ctx.message;
        if (!m) return MessageType.UNKNOWN;

        if (m.text && m.text.trim()) {
            // 检查文本中是否包含网址链接
            const urlRegex = /(https?:\/\/[^\s]+)/i;
            if (urlRegex.test(m.text)) {
                return MessageType.WEB_LINK;
            }
            return MessageType.TEXT;
        }

        if (m.photo?.length) {
            return m.media_group_id ? MessageType.MEDIA_GROUP : MessageType.SINGLE_PHOTO;
        }

        return MessageType.UNKNOWN;
    }

    async handleMessage(ctx: MyContext) {
        console.log("🔍 [MessageReceiver] 开始处理消息");
        console.log("🔍 [MessageReceiver] 消息内容:", JSON.stringify(ctx.message, null, 2));

        const type = this.classifyMessage(ctx);
        console.log(`🔍 [MessageReceiver] 消息分类结果: ${type}`);

        const chatId = ctx.chat!.id;
        const userId = ctx.from!.id;
        const taskId = this.generateTaskId();

        console.log(`🔍 [MessageReceiver] ChatID: ${chatId}, UserID: ${userId}, TaskID: ${taskId}`);

        const busy = await getUserBusy(ctx.from!.id);
        if (busy.busy) {
            console.log(`🔍 [MessageReceiver] 用户忙碌状态: ${busy.phase}`);
            await ctx.reply(`正在处理你的上一个任务（${busy.phase}）中，我已把这条加入队列。`);
        }

        if (type === MessageType.TEXT) {
            console.log("🔍 [MessageReceiver] 处理文本消息");
            const text = ctx.message!.text!;
            await this.queue.add("text", { taskId, chatId, userId, text, mode: ProcessingMode.PROCESS });
            await ctx.reply("已收到文本，开始处理⚙️...", { disable_notification: true });
            return;
        }

        if (type === MessageType.MEDIA_GROUP) {
            console.log("🔍 [MessageReceiver] 处理媒体组消息");
            const photo = ctx.message!.photo!.at(-1)!;
            const groupId = ctx.message?.media_group_id!;
            await ctx.api.sendChatAction(chatId, "typing");

            ctx.state.__mediaGroup?.(chatId, userId, groupId, photo.file_id, taskId);
            return;
        }

        if (type === MessageType.SINGLE_PHOTO) {
            console.log("🔍 [MessageReceiver] 处理单张图片消息");
            const photo = ctx.message!.photo!.at(-1)!;
            console.log(`🔍 [MessageReceiver] 图片信息: fileId=${photo.file_id}, fileUniqueId=${photo.file_unique_id}`);

            try {
                console.log("🔍 [MessageReceiver] 开始添加OCR任务到队列");
                const job = await this.queue.add("ocr-single", {
                    chatId,
                    userId,
                    fileId: photo.file_id,
                    taskId,
                }, { jobId: taskId, ...defaultJobOpts });

                console.log(`🔍 [MessageReceiver] OCR任务添加成功: ${job?.id}`);
                await ctx.reply("我收到了图片，开始识别 🔍～", { disable_notification: true });
                console.log("🔍 [MessageReceiver] 已发送确认消息");
            } catch (error) {
                console.error("❌ [MessageReceiver] 添加OCR任务失败:", error);
                await ctx.reply("抱歉，处理图片时出现错误，请稍后重试。");
            }
            return;
        }

        if (type === MessageType.WEB_LINK) {
            console.log("🔍 [MessageReceiver] 处理网址链接消息");
            const text = ctx.message!.text!;
            // 提取URL
            const urlRegex = /(https?:\/\/[^\s]+)/i;
            const urlMatch = text.match(urlRegex);
            const url = urlMatch ? urlMatch[1] : '';

            console.log(`🔍 [MessageReceiver] 检测到URL: ${url}`);
            const job = await this.queue.add('web-link', {
                taskId,
                chatId,
                userId,
                url,
                mode: ProcessingMode.PROCESS
            });
            await ctx.reply("我收到了网址链接 🔗，开始处理...", { disable_notification: true });

            return;
        }

        // 如果到这里说明是未知消息类型
        console.log(`未知消息类型: ${type}, 消息内容:`, ctx.message);



    }


}