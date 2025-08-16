import { Job } from "bullmq";
import { type TextJobData } from "../../types/models.js";
import { RateLimiter } from "../../services/rate-limiter.js";
import { DeepSeekClient } from "../../services/deepseek.js";

export class TextProcessor {
    private limiter = new RateLimiter(1, 1000);
    private ds: DeepSeekClient;
    constructor(apiKey: string) {
        this.ds = new DeepSeekClient(apiKey);
    }

    preprocessText(text: string) {
        return text.replace(/\u00A0/g, " ").trim();
    }

    async callDeepSeekAPI(text: string, mode: string) {
        await this.limiter.wait();
        return this.ds.chat(text, mode as any);
    }

    async process(job: Job<TextJobData>) {
        const { text, mode } = job.data;
        const clean = this.preprocessText(text);
        return this.callDeepSeekAPI(clean, mode);
    }

    // 新增：专门处理OCR识别的文本
    async processOCRText(ocrText: string) {
        console.log("🔍 [TextProcessor] 开始处理OCR文本");
        console.log(`🔍 [TextProcessor] OCR原始文本长度: ${ocrText.length}`);

        const clean = this.preprocessText(ocrText);
        console.log(`🔍 [TextProcessor] 预处理后文本长度: ${clean.length}`);

        // OCR文本使用PROCESS模式进行处理
        const result = await this.callDeepSeekAPI(clean, "PROCESS");
        console.log(`🔍 [TextProcessor] DeepSeek处理完成，结果长度: ${result.length}`);

        return result;
    }


}