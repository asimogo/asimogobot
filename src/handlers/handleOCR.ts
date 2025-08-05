// handlers/handleOCR.ts
import axios from 'axios';
import { getFileUrl } from '../utils/telegramFiles.js';
import { callBaiduOCRWithBuffer } from '../utils/baiduorc.js'

export async function handleOCR(botToken: string, fileId: string): Promise<string> {
    const url = await getFileUrl(botToken, fileId);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // 使用百度 OCR
    const rawText = await callBaiduOCRWithBuffer(buffer);
    return rawText;
}

