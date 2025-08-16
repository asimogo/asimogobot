// 调试图片处理流程的脚本
import dotenv from "dotenv";
import { Bot } from "grammy";
import { TaskQueue } from "./src/queue/queues.js";
import { MessageReceiver } from "./src/bot/receivers.js";
import { MessageType } from "./src/types/enums.js";

dotenv.config();

async function debugImageFlow() {
  console.log("🔍 调试图片处理流程...\n");

  // 检查环境变量
  const botToken = process.env.BOT_TOKEN;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const baiduAccessToken = process.env.BAIDU_OCR_TOKEN;
  const baiduAppId = process.env.BAIDU_APPID;
  const baiduSecret = process.env.BAIDU_SECRET;
  const useAppSecretMode = process.env.USE_BAIDU_APP_SECRET_MODE === "true";

  if (!botToken || !deepseekKey || !baiduAccessToken) {
    console.log("❌ 错误: 缺少必要的配置");
    return;
  }

  try {
    console.log("1️⃣ 创建模拟环境...");

    // 创建模拟的API对象
    const mockApi = {
      sendMessage: (chatId, text, options) => {
        console.log(`📤 API调用 - sendMessage:`);
        console.log(`   ChatID: ${chatId}`);
        console.log(`   Text: ${text}`);
        console.log(`   Options:`, options);
        return Promise.resolve({ message_id: Date.now() });
      },
      sendChatAction: (chatId, action) => {
        console.log(`📤 API调用 - sendChatAction: ${chatId}, ${action}`);
        return Promise.resolve();
      },
    };

    // 创建TaskQueue实例
    const taskQueue = new TaskQueue(mockApi, botToken, {
      deepseekKey,
      baiduAccessToken,
      ...(baiduAppId && { baiduAppId }),
      ...(baiduSecret && { baiduSecret }),
      useBaiduAppSecretMode: useAppSecretMode,
    });

    console.log("✅ TaskQueue 创建成功");

    // 创建MessageReceiver
    const receiver = new MessageReceiver(taskQueue);
    console.log("✅ MessageReceiver 创建成功");

    console.log("\n2️⃣ 测试消息分类...");

    // 模拟单张图片消息
    const mockSinglePhotoMessage = {
      message: {
        photo: [
          {
            file_id: "photo_1",
            file_unique_id: "unique_1",
            width: 100,
            height: 100,
          },
          {
            file_id: "photo_2",
            file_unique_id: "unique_2",
            width: 200,
            height: 200,
          },
          {
            file_id: "photo_3",
            file_unique_id: "unique_3",
            width: 300,
            height: 300,
          },
        ],
        // 注意：没有 media_group_id
      },
    };

    const messageType = receiver.classifyMessage(mockSinglePhotoMessage);
    console.log(`📝 消息分类结果: ${messageType}`);
    console.log(`📝 预期结果: ${MessageType.SINGLE_PHOTO}`);
    console.log(
      `✅ 分类${messageType === MessageType.SINGLE_PHOTO ? "正确" : "错误"}`,
    );

    console.log("\n3️⃣ 测试任务添加...");

    // 监听队列事件
    taskQueue.ocrQueue.on("added", (job) => {
      console.log(`🔄 任务已添加到队列: ${job.id}, 任务名: ${job.name}`);
    });

    taskQueue.ocrQueue.on("active", (job) => {
      console.log(`🔄 任务开始处理: ${job.id}`);
    });

    taskQueue.ocrQueue.on("completed", (job, result) => {
      console.log(`✅ 任务完成: ${job.id}`);
      console.log(`📄 结果: ${result}`);
    });

    taskQueue.ocrQueue.on("failed", (job, err) => {
      console.log(`❌ 任务失败: ${job.id}`);
      console.log(`❌ 错误: ${err.message}`);
    });

    // 模拟完整的上下文
    const mockContext = {
      message: mockSinglePhotoMessage.message,
      chat: { id: 123456 },
      from: { id: 789012 },
      reply: (text) => {
        console.log(`🤖 Bot回复: ${text}`);
        return Promise.resolve();
      },
      api: mockApi,
    };

    console.log("📤 开始处理模拟消息...");
    await receiver.handleMessage(mockContext);

    console.log("\n4️⃣ 等待任务处理...");
    // 等待一段时间看任务处理情况
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("\n✅ 调试完成！");
  } catch (error) {
    console.error("❌ 调试失败:", error);
    console.error("Stack:", error.stack);
  }

  // 退出程序
  process.exit(0);
}

// 运行调试
debugImageFlow().catch(console.error);
