import axios from "axios";
import md5 from 'md5';
import dotenv from "dotenv";
import FormData from 'form-data';

dotenv.config();

const appid = process.env.BAIDU_APPID;
const secret = process.env.BAIDU_SECRET;
const cuid = 'telegram_bot';
const mac = '00:00:00:00:00:00';
const OCR_URL = 'https://fanyi-api.baidu.com/api/trans/sdk/picture';

export async function callBaiduOCRWithBuffer(buffer: Buffer): Promise<string> {
    const salt = Date.now().toString();
    const imageMd5 = md5(buffer);
    const sign = md5(`${appid}${imageMd5}${salt}${cuid}${mac}${secret}`);

    const form = new FormData();
    form.append('image', buffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg'
    });
    form.append('from', 'zh');  // 你也可以用 'auto'
    form.append('to', 'zh');    // 如果你只要识别而不翻译，就写同一个语言
    form.append('appid', appid);
    form.append('salt', salt);
    form.append('cuid', cuid);
    form.append('mac', mac);
    form.append('version', '3');
    form.append('sign', sign);

    const response = await axios.post(OCR_URL, form, {
        headers: form.getHeaders()
    });

    const segments = response.data?.data?.content;
    if (!segments || !Array.isArray(segments)) {
        console.error('OCR response error:', response.data);
        throw new Error('❌ OCR识别失败或格式异常');
    }

    const rawText = segments.map((s: any) => s.src).join('\n');
    return rawText;
}
