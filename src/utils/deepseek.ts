import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!; // 记得设置在 .env

export async function polishTextWithDeepSeek(rawText: string): Promise<string> {
    const systemPrompt = `
你是一位语言专家。请对用户提供的原始文字内容进行：
1. 拼写检查、语法修正
2. 合理断句、调整段落结构
3. 必要时重组语序、补充上下文，让内容更清晰
4. 输出结果为 **格式清晰的 Markdown**
`;

    const userMessage = `以下是OCR识别出来的原始内容，请进行润色：

${rawText}
`;

    const response = await axios.post(
        DEEPSEEK_API_URL,
        {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
        },
        {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('❌ DeepSeek 无返回内容');
    }

    return content;
}
