import type { Job } from "bullmq";
import type { OCRGroupJobData, OCRSingleJobData } from "../../types/models.js";
import { RateLimiter } from "../../services/rate-limiter.js";
import { BaiduOCRClient } from "../../services/baidu-ocr.js";
import { downloadFileBuffer } from "../../utils/tg.js";

export class OCRProcessor {
    private limiter = new RateLimiter(2, 1000); // 示例：1s 2次
    private baidu: BaiduOCRClient;

    constructor(
        private api: any,
        private botToken: string,
        appid?: string,
        secret?: string
    ) {
        console.log("🔍 [OCRProcessor] 初始化配置:");
        console.log(`  - AppID: ${appid ? '已提供' : '未提供'}`);
        console.log(`  - Secret: ${secret ? '已提供' : '未提供'}`);

        this.baidu = new BaiduOCRClient(appid, secret);
    }

    private async callBaiduOCR(img: Buffer): Promise<string> {
        console.log("🔍 [OCRProcessor] 调用百度OCR");
        await this.limiter.wait();

        try {
            const result = await this.baidu.recognize(img);
            console.log("🔍 [OCRProcessor] OCR识别完成");
            return result;
        } catch (error) {
            console.error("❌ [OCRProcessor] 百度OCR调用失败:", error);
            throw error;
        }
    }

    async processSinglePhoto(job: Job<OCRSingleJobData>) {
        console.log(`🔍 [OCRProcessor] 处理单张图片: ${job.id}`);
        const { chatId, fileId } = job.data;
        console.log(`🔍 [OCRProcessor] ChatID: ${chatId}, FileID: ${fileId}`);

        try {
            console.log("🔍 [OCRProcessor] 开始下载文件");
            const buf = await downloadFileBuffer(this.api, fileId, this.botToken);
            console.log(`🔍 [OCRProcessor] 文件下载完成，大小: ${buf.length} bytes`);

            console.log("🔍 [OCRProcessor] 开始OCR识别");
            const text = await this.callBaiduOCR(buf);
            console.log(`🔍 [OCRProcessor] OCR识别完成，结果长度: ${text.length}`);

            return text;
        } catch (error) {
            console.error("❌ [OCRProcessor] 处理单张图片失败:", error);
            throw error;
        }
    }

    async processMediaGroup(job: Job<OCRGroupJobData>) {
        const { fileIds } = job.data;
        const texts: string[] = [];
        for (const id of fileIds) {
            const buf = await downloadFileBuffer(this.api, id, this.botToken);
            texts.push(await this.callBaiduOCR(buf));
        }
        return texts.join("\n\n");
    }
}