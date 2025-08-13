import { handleSinglePhoto } from '../handlers/handleSinglePhoto.js';
import { handleMediaGroupPhoto } from '../handlers/handleMediaGroupPhoto.js';
import { handleFlomo } from '../handlers/handleFlomo.js';
import { handleNotion } from '../handlers/handleNotion.js';
import { Bot, session, webhookCallback } from 'grammy';
import type { MyContext, SessionData } from '../utils/types.js';
import dotenv from 'dotenv';
import { createServer } from 'http';


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
    return ctx.reply('嗨，主人，我是你的私人助理！请发送 /help 查看可用命令');
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

// 创建健康检查服务器
const port = process.env.PORT || 3000;
const server = createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(port, () => {
    console.log(`Health check server running on port ${port}`);
});

// 启动 bot
bot.start();

// 优雅关闭处理
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    bot.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    bot.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
