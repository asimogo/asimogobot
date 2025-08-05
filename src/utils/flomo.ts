import axios from 'axios';

const FLOMO_WEBHOOK = process.env.FLOMO_WEBHOOK!; // 建议放到 .env 文件里

export async function saveToFlomo(markdown: string): Promise<void> {
    await axios.post(FLOMO_WEBHOOK, {
        content: markdown
    });
}
