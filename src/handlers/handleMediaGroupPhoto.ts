import { type MyContext } from '../utils/types.js';
import { mediaGroupCache, mediaGroupTimeouts } from '../utils/cache.js';
import { handleOCR } from './handleOCR.js';
import { handlePolish } from './handlePolish.js';

export async function handleMediaGroupPhoto(ctx: MyContext) {
    if (!ctx.message) return;
    const mediaGroupId = ctx.message.media_group_id!;
    const fileId = ctx.message.photo?.at(-1)?.file_id;
    if (!fileId) return;

    const now = Date.now();
    if (mediaGroupCache.has(mediaGroupId)) {
        const group = mediaGroupCache.get(mediaGroupId)!;
        group.fileIds.push(fileId);
        group.lastUpdate = now;
    } else {
        mediaGroupCache.set(mediaGroupId, { fileIds: [fileId], lastUpdate: now });
    }

    if (mediaGroupTimeouts.has(mediaGroupId)) {
        clearTimeout(mediaGroupTimeouts.get(mediaGroupId)!);
    }

    const timeout = setTimeout(async () => {
        const group = mediaGroupCache.get(mediaGroupId);
        if (!group) return;

        try {
            const ocrResults = await Promise.all(
                group.fileIds.map((fileId) => handleOCR(process.env.BOT_TOKEN!, fileId))
            );
            const rawText = ocrResults.join('\n\n');
            const polished = await handlePolish(rawText);

            ctx.session.lastPolishedText = polished;
            await ctx.reply(`✨ 澎色完成内容：\n\n${polished}`, { parse_mode: 'Markdown' });
            await ctx.reply('是否保存到 Flomo 或 Noton？', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ 保存到 Flomo', callback_data: 'save_flomo' },
                        { text: '📘 Notion', callback_data: 'save_notion' }
                        ]
                    ]
                }
            });
        } catch (err) {
            console.error('❌ 媒体组处理失败:', err);
            await ctx.reply('❌ 处理媒体组图片时出错');
        }

        mediaGroupCache.delete(mediaGroupId);
        mediaGroupTimeouts.delete(mediaGroupId);
    }, 3000);

    mediaGroupTimeouts.set(mediaGroupId, timeout);
}