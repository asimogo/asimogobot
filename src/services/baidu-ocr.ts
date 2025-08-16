// src/services/baidu-ocr.ts
import axios from "axios";
import md5 from 'md5';
import FormData from 'form-data';

export class BaiduOCRClient {
    private appid: string;
    private secret: string;

    constructor(appid?: string, secret?: string) {
        this.appid = appid || process.env.BAIDU_APPID || '';
        this.secret = secret || process.env.BAIDU_SECRET || '';

        console.log("🔍 [BaiduOCRClient] 初始化配置:");
        console.log(`🔍 [BaiduOCRClient] AppID: ${this.appid ? '已设置' : '未设置'}`);
        console.log(`🔍 [BaiduOCRClient] Secret: ${this.secret ? '已设置' : '未设置'}`);
    }

    async recognize(buffer: Buffer): Promise<string> {
        console.log("🔍 [BaiduOCRClient] 开始OCR识别");

        if (!this.appid || !this.secret) {
            throw new Error('❌ 缺少百度OCR的APPID或SECRET配置');
        }

        const cuid = 'telegram_bot';
        const mac = '00:00:00:00:00:00';
        const OCR_URL = 'https://fanyi-api.baidu.com/api/trans/sdk/picture';

        const salt = Date.now().toString();
        const imageMd5 = md5(buffer);
        const sign = md5(`${this.appid}${imageMd5}${salt}${cuid}${mac}${this.secret}`);

        console.log(`🔍 [BaiduOCRClient] 请求参数:`);
        console.log(`  - AppID: ${this.appid}`);
        console.log(`  - Salt: ${salt}`);
        console.log(`  - ImageMD5: ${imageMd5}`);
        console.log(`  - Sign: ${sign}`);

        const form = new FormData();
        form.append('image', buffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });
        form.append('from', 'zh');  // 源语言
        form.append('to', 'zh');    // 目标语言（识别不翻译时设置相同）
        form.append('appid', this.appid);
        form.append('salt', salt);
        form.append('cuid', cuid);
        form.append('mac', mac);
        form.append('version', '3');
        form.append('sign', sign);

        console.log("🔍 [BaiduOCRClient] 发送请求到百度API");
        const response = await axios.post(OCR_URL, form, {
            headers: form.getHeaders()
        });

        console.log(`🔍 [BaiduOCRClient] API响应状态: ${response.status}`);
        console.log(`🔍 [BaiduOCRClient] API响应数据:`, JSON.stringify(response.data, null, 2));

        const segments = response.data?.data?.content;
        if (!segments || !Array.isArray(segments)) {
            console.error('❌ [BaiduOCRClient] OCR response error:', response.data);
            throw new Error('❌ OCR识别失败或格式异常');
        }

        const rawText = segments.map((s: any) => s.src).join('\n');
        console.log(`🔍 [BaiduOCRClient] 识别结果: "${rawText}"`);
        return rawText;
    }
}