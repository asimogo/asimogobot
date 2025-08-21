import { type MyContext } from '../utils/types.js';
import { fetchWechatMarkdown } from '../utils/metaso.js';
import { handlePolish } from './handlePolish.js';
import { safeReply } from '../utils/safeReply.js';
import { logger } from '../utils/logger.js';

const WECHAT_REG = /https?:\/\/mp\.weixin\.qq\.com\/\S+/i;

export function extractWechatLink(text?: string): string | null {
  if (!text) return null;
  const match = text.match(WECHAT_REG);
  return match ? match[0] : null;
}

export async function handleWechatLink(ctx: MyContext) {
  const link = extractWechatLink(ctx.message?.text);
  if (!link) return;

  logger.info('处理微信链接', link);
  const markdown = await fetchWechatMarkdown(link);
  const polished = await handlePolish(markdown);

  ctx.session.lastPolishedText = polished;

  await safeReply(ctx, `✨ 澎色完成内容：\n\n${polished}`, { parse_mode: 'Markdown' });
  await ctx.reply('是否保存到 Flomo？', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ 保存到 Flomo', callback_data: 'save_flomo' },
          { text: '📘 Notion', callback_data: 'save_notion' }
        ]
      ]
    }
  });
}
