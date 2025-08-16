import { Queue, Worker, type JobsOptions } from "bullmq"
import { redis as connection } from "../services/redis.js";
import { TextProcessor } from "./processors/text-processor.js";
import { ResultHandler } from "src/services/result-handler.js";
import { markBusy, clearBusy, heartbeat } from "../services/user-state.js";
import { OCRProcessor } from "../queue/processors/ocr-processor.js";


export class TaskQueue {
    textQueue: Queue;
    ocrQueue: Queue;

    constructor(
        private api: any,
        private botToken: string,
        private opts: {
            deepseekKey: string;
            baiduAppId?: string;
            baiduSecret?: string;
        }
    ) {
        this.textQueue = new Queue('text', { connection });
        this.ocrQueue = new Queue("ocr", { connection });
    }



    setupProcessors() {
        const textProc = new TextProcessor(this.opts.deepseekKey);
        const ocrProc = new OCRProcessor(
            this.api,
            this.botToken,
            this.opts.baiduAppId,
            this.opts.baiduSecret
        );
        const result = new ResultHandler(this.api);

        new Worker("text", async job => {
            const { userId } = job.data;
            await markBusy(userId, job.data.taskId, "DEEPSEEK");
            try {
                const out = await textProc.process(job);
                await heartbeat(userId);
                await result.sendResultToUser(job.data.chatId, out, job.data.taskId, "TEXT");
                return out;
            } finally {
                await clearBusy(userId);
            }
        }, { connection });


        new Worker("ocr", async job => {
            console.log(`🔍 [OCR Worker] 开始处理任务: ${job.name}#${job.id}`);
            console.log(`🔍 [OCR Worker] 任务数据:`, job.data);

            const { userId } = job.data;
            await markBusy(userId, job.data.taskId, "OCR");
            try {
                const name = job.name;
                console.log(`🔍 [OCR Worker] 任务类型: ${name}`);

                let ocrText = "";
                if (name === "ocr-single") {
                    console.log("🔍 [OCR Worker] 处理单张图片");
                    ocrText = await ocrProc.processSinglePhoto(job as any);
                }
                if (name === "ocr-media-group") {
                    console.log("🔍 [OCR Worker] 处理媒体组");
                    ocrText = await ocrProc.processMediaGroup(job as any);
                }

                console.log(`🔍 [OCR Worker] OCR处理完成，识别文本长度: ${ocrText.length}`);

                if (!ocrText || ocrText.trim().length === 0) {
                    console.log("🔍 [OCR Worker] OCR未识别到文本，直接返回提示");
                    await result.sendResultToUser(job.data.chatId, "抱歉，图片中未识别到文字内容。", job.data.taskId, "OCR");
                    return "无文字内容";
                }

                await heartbeat(userId);
                await markBusy(userId, job.data.taskId, "DEEPSEEK");

                console.log("🔍 [OCR Worker] 开始DeepSeek处理OCR文本");
                const processedText = await textProc.processOCRText(ocrText);
                console.log(`🔍 [OCR Worker] DeepSeek处理完成，结果长度: ${processedText.length}`);

                await heartbeat(userId);

                console.log("🔍 [OCR Worker] 开始发送最终结果");
                await result.sendResultToUser(job.data.chatId, processedText, job.data.taskId, "OCR");
                console.log("🔍 [OCR Worker] 结果发送完成");

                return processedText;

            } catch (error) {
                console.error(`❌ [OCR Worker] 处理任务失败: ${job.name}#${job.id}`, error);
                throw error;
            } finally {
                await clearBusy(userId);
                console.log(`🔍 [OCR Worker] 任务完成清理: ${job.name}#${job.id}`);
            }

        }, { connection });

    }


    async add(type: "text" | "ocr-single" | "ocr-media-group", data: any, jobOpts?: JobsOptions) {
        console.log(`🔍 [TaskQueue] 添加任务: type=${type}, taskId=${data.taskId}`);
        console.log(`🔍 [TaskQueue] 任务数据:`, data);
        console.log(`🔍 [TaskQueue] 任务选项:`, jobOpts);

        if (type === "text") {
            console.log("🔍 [TaskQueue] 添加到文本队列");
            return this.textQueue.add("text", data, jobOpts);
        }

        if (type === "ocr-single" || type === "ocr-media-group") {
            console.log("🔍 [TaskQueue] 添加到OCR队列");
            const job = await this.ocrQueue.add(type, data, jobOpts);
            console.log(`🔍 [TaskQueue] OCR任务添加成功: ${job.id}`);
            return job;
        }

        console.error(`❌ [TaskQueue] 未知任务类型: ${type}`);
        throw new Error(`未知任务类型: ${type}`);
    }

}

/** 统一推荐的任务选项 */
export const defaultJobOpts: JobsOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 60 * 60, count: 1000 },
    removeOnFail: { age: 24 * 60 * 60 },
};

export const textQueue = new Queue("text", { connection });
export const ocrQueue = new Queue("ocr", { connection });

/** 提供给 /status 的计数 */
export async function getQueueOverview() {
    const t = await textQueue.getJobCounts("waiting", "active", "delayed", "failed", "completed");
    const o = await ocrQueue.getJobCounts("waiting", "active", "delayed", "failed", "completed");
    return { text: t, ocr: o };
}

