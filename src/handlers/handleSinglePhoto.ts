import { type MyContext } from '../utils/types.js';
import { handleOCR } from './handleOCR.js';
import { handlePolish } from './handlePolish.js';

export async function handleSinglePhoto(ctx: MyContext) {
    if (!ctx.message) return;

    const fileId = ctx.message.photo?.at(-1)?.file_id;
    if (!fileId) return;

    const rawText = await handleOCR(process.env.BOT_TOKEN!, fileId);
    const polished = await handlePolish(rawText);

    ctx.session.lastPolishedText = polished;

    await ctx.reply(`✨ 澎色完成内容：\n\n${polished}`, { parse_mode: 'Markdown' });
    await ctx.reply('是否保存到 Flomo？', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ 保存到 Flomo', callback_data: 'save_flomo' },
                { text: '📘 Notion', callback_data: 'save_notion' }
                ]
            ]
        }
    });
}