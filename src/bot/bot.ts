import { handleSinglePhoto } from '../handlers/handleSinglePhoto.js';
import { handleMediaGroupPhoto } from '../handlers/handleMediaGroupPhoto.js';
import { handleFlomo } from '../handlers/handleFlomo.js';
import { handleNotion } from '../handlers/handleNotion.js';
import { Bot, session } from 'grammy';
import type { MyContext, SessionData } from '../utils/types.js';
import dotenv from 'dotenv';


// 加载环境变量
dotenv.config();


const bot = new Bot<MyContext>(process.env.BOT_TOKEN);

// 设置错误处理
bot.catch(err => {
    console.error('Bot error:', err)
})



bot.use(session({
    initial: (): SessionData => ({})
}));



bot.on('message:photo', async (ctx) => {
    if (ctx.message.media_group_id) {
        await handleMediaGroupPhoto(ctx);
    } else {
        await handleSinglePhoto(ctx);
    }
});


bot.command('start', ctx => {
    return ctx.reply('嗨，哥们，我是你的私人助理！请发送 /help 查看可用命令');
})

bot.callbackQuery('save_flomo', async (ctx) => {
    const content = ctx.session.lastPolishedText;

    if (!content) {
        await ctx.answerCallbackQuery({ text: '⚠️ 没有可保存的内容', show_alert: true });
        return;
    }

    try {
        await handleFlomo(content);
        await ctx.answerCallbackQuery({ text: '✅ 已保存到 Flomo' });
    } catch (err) {
        console.error('❌ 保存到 Flomo 失败:', err);
        await ctx.answerCallbackQuery({ text: '❌ 保存失败', show_alert: true });
    }
});

bot.callbackQuery('save_notion', async (ctx) => {
    const content = ctx.session.lastPolishedText;

    if (!content) {
        await ctx.answerCallbackQuery({ text: '⚠️ 没有可保存的内容', show_alert: true });
        return;
    }

    try {
        await handleNotion(content);
        await ctx.answerCallbackQuery({ text: '✅ 已保存到 Notion' });
    } catch (err) {
        console.error('❌ 保存到 Notion 失败:', err);
        await ctx.answerCallbackQuery({ text: '❌ 保存失败', show_alert: true });
    }
});

bot.start();
