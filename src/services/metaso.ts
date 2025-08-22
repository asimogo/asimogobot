// metaso.ts
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';

interface MetasoRequestData {
    url: string;
}

interface MetasoResponse {
    // Add specific response type based on actual API response
    [key: string]: any;
}

export class MetasoService {
    private readonly apiUrl = 'https://metaso.cn/api/v1/reader';
    private readonly apiKey = 'mk-83B606FB4800FFFFCCEC71D567B6C363';

    /**
     * 获取网页内容
     * @param url 要抓取的网页URL
     * @returns 网页内容
     */
    async getWebpageContent(url: string): Promise<string> {
        try {
            const config: AxiosRequestConfig = {
                method: 'post',
                maxBodyLength: Infinity,
                url: this.apiUrl,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'text/plain',
                    'Content-Type': 'application/json'
                },
                data: { url }
            };

            console.log(`🔍 [MetasoService] 开始抓取网页: ${url}`);
            const response: AxiosResponse<MetasoResponse> = await axios.request(config);

            console.log(`✅ [MetasoService] 网页抓取成功: ${url}`);
            console.log(`🔍 [MetasoService] 响应数据:`, response.data);

            // 根据实际API响应结构返回内容
            // 这里假设API返回的内容在某个字段中，需要根据实际情况调整
            if (response.data && typeof response.data === 'string') {
                return response.data;
            } else if (response.data && response.data.content) {
                return response.data.content;
            } else if (response.data && response.data.text) {
                return response.data.text;
            } else {
                // 如果没有找到预期的内容字段，返回整个响应
                return JSON.stringify(response.data, null, 2);
            }
        } catch (error) {
            console.error(`❌ [MetasoService] 抓取网页失败: ${url}`, error);
            throw new Error(`抓取网页失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 检查URL是否有效
     * @param url 要检查的URL
     * @returns 是否为有效的URL
     */
    isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

// 创建默认实例
export const metasoService = new MetasoService();

// 导出便捷函数
export const getWebpageContent = (url: string) => metasoService.getWebpageContent(url);
export const isValidUrl = (url: string) => metasoService.isValidUrl(url);