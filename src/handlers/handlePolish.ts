
import { polishTextWithDeepSeek } from '../utils/deepseek.js'
export async function handlePolish(rawText: string): Promise<string> {
    const polished = await polishTextWithDeepSeek(rawText);
    return polished;
}