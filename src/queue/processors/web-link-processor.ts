import { Job } from "bullmq";
import { metasoService } from "../../services/metaso.js";
import { TextProcessor } from "./text-processor.js";

interface WebLinkJobData {
    chatId: number;
    userId: number;
    url: string;
    taskId?: string;
}

export class WebLinkProcessor {
    private textProcessor: TextProcessor;

    constructor(deepseekApiKey: string) {
        this.textProcessor = new TextProcessor(deepseekApiKey);
    }

    /**
     * 处理网页链接任务
     * @param job 任务对象
     * @returns 处理结果
     */
    async process(job: Job<WebLinkJobData>): Promise<string> {
        const { url, taskId } = job.data;

        console.log(`🔍 [WebLinkProcessor] 开始处理网页链接任务: ${taskId}`);
        console.log(`🔍 [WebLinkProcessor] 目标URL: ${url}`);

        try {
            // 验证URL
            if (!metasoService.isValidUrl(url)) {
                throw new Error(`无效的URL: ${url}`);
            }

            // 获取网页内容
            const rawContent = await metasoService.getWebpageContent(url);
            console.log(`✅ [WebLinkProcessor] 网页内容获取成功，长度: ${rawContent.length}`);

            // 如果原始内容太长，先进行截断
            const maxRawLength = 8000; // 给DeepSeek处理留一些余量
            let contentToProcess = rawContent;
            if (rawContent.length > maxRawLength) {
                contentToProcess = rawContent.substring(0, maxRawLength) + "\n\n... (内容已截断)";
                console.log(`🔍 [WebLinkProcessor] 原始内容过长，截断后长度: ${contentToProcess.length}`);
            }

            // 使用TextProcessor处理网页内容，通过DeepSeek API进行润色
            console.log(`🔍 [WebLinkProcessor] 开始使用DeepSeek处理网页内容`);
            const processedContent = await this.textProcessor.processWebpageContent(contentToProcess);
            console.log(`✅ [WebLinkProcessor] DeepSeek处理完成，结果长度: ${processedContent.length}`);

            // 如果处理后的内容太长，再次截断以适应Telegram消息长度限制
            const maxFinalLength = 4000; // Telegram消息长度限制
            if (processedContent.length > maxFinalLength) {
                const truncatedContent = processedContent.substring(0, maxFinalLength) + "\n\n... (内容已截断，完整内容请查看原始网页)";
                console.log(`🔍 [WebLinkProcessor] 最终内容过长，截断后长度: ${truncatedContent.length}`);
                return truncatedContent;
            }

            return processedContent;

        } catch (error) {
            console.error(`❌ [WebLinkProcessor] 处理网页链接失败: ${url}`, error);
            throw new Error(`处理网页链接失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
}
