import { Bot } from 'grammy';
export async function getFileUrl(botToken: string, fileId: string): Promise<string> {
    const bot = new Bot(botToken);
    const file = await bot.api.getFile(fileId);

    if (!file.file_path) {
        throw new Error('❌ 无法获取 file_path');
    }

    return `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
}