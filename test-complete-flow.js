// 完整测试图片处理流程
import dotenv from "dotenv";
import { TaskQueue } from "./src/queue/queues.js";
import { MessageReceiver } from "./src/bot/receivers.js";
import { MessageType } from "./src/types/enums.js";

dotenv.config();

async function testCompleteFlow() {
  console.log("🧪 测试完整图片处理流程...\n");

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
    console.log("1️⃣ 创建队列和处理器...");

    // 创建模拟的API对象
    const mockApi = {
      sendMessage: (chatId, text, options) => {
        console.log(`📤 发送消息到 ${chatId}:`);
        console.log(`   内容: ${text}`);
        if (options?.reply_markup) {
          console.log(`   附带键盘: 是`);
        }
        return Promise.resolve({ message_id: Date.now() });
      },
      sendChatAction: (chatId, action) => {
        console.log(`📤 发送动作: ${action} 到 ${chatId}`);
        return Promise.resolve();
      },
      getFile: (fileId) => {
        console.log(`📤 获取文件: ${fileId}`);
        return Promise.resolve({
          file_id: fileId,
          file_path: `photos/${fileId}.jpg`,
        });
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

    // 设置处理器
    taskQueue.setupProcessors();
    console.log("✅ Processors 设置成功");

    // 创建MessageReceiver
    const receiver = new MessageReceiver(taskQueue);
    console.log("✅ MessageReceiver 创建成功");

    console.log("\n2️⃣ 监听队列事件...");

    // 监听队列事件
    taskQueue.ocrQueue.on("added", (job) => {
      console.log(`🟢 [OCR队列] 任务已添加: ${job.name}#${job.id}`);
      console.log(`   数据:`, job.data);
    });

    taskQueue.ocrQueue.on("active", (job) => {
      console.log(`🔄 [OCR队列] 任务开始处理: ${job.name}#${job.id}`);
    });

    taskQueue.ocrQueue.on("completed", (job, result) => {
      console.log(`✅ [OCR队列] 任务完成: ${job.name}#${job.id}`);
      console.log(`   结果长度: ${result ? result.length : 0} 字符`);
    });

    taskQueue.ocrQueue.on("failed", (job, err) => {
      console.log(`❌ [OCR队列] 任务失败: ${job.name}#${job.id}`);
      console.log(`   错误: ${err.message}`);
      console.log(`   堆栈: ${err.stack}`);
    });

    taskQueue.ocrQueue.on("stalled", (job) => {
      console.log(`⏸️ [OCR队列] 任务停滞: ${job.name}#${job.id}`);
    });

    console.log("\n3️⃣ 模拟图片消息...");

    // 模拟单张图片消息
    const mockContext = {
      message: {
        photo: [
          {
            file_id: "photo_small",
            file_unique_id: "unique_small",
            width: 100,
            height: 100,
          },
          {
            file_id: "photo_medium",
            file_unique_id: "unique_medium",
            width: 200,
            height: 200,
          },
          {
            file_id: "photo_large",
            file_unique_id: "unique_large",
            width: 400,
            height: 400,
          },
        ],
        // 注意：没有 media_group_id，所以是单张图片
      },
      chat: { id: 123456 },
      from: { id: 789012 },
      reply: (text) => {
        console.log(`🤖 Bot 回复: ${text}`);
        return Promise.resolve();
      },
      api: mockApi,
    };

    // 测试消息分类
    const messageType = receiver.classifyMessage(mockContext);
    console.log(
      `📝 消息类型: ${messageType} (预期: ${MessageType.SINGLE_PHOTO})`,
    );

    if (messageType !== MessageType.SINGLE_PHOTO) {
      console.log("❌ 消息分类错误！");
      return;
    }

    console.log("\n4️⃣ 处理消息...");

    // 处理消息
    await receiver.handleMessage(mockContext);

    console.log("\n5️⃣ 等待处理结果...");

    // 等待任务处理
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 检查队列状态
    const ocrCounts = await taskQueue.ocrQueue.getJobCounts();
    console.log("\n📊 OCR队列状态:");
    console.log(`   等待中: ${ocrCounts.waiting}`);
    console.log(`   处理中: ${ocrCounts.active}`);
    console.log(`   已完成: ${ocrCounts.completed}`);
    console.log(`   失败: ${ocrCounts.failed}`);

    console.log("\n✅ 测试完成！");

    if (ocrCounts.completed > 0) {
      console.log("🎉 图片处理流程正常工作！");
    } else if (ocrCounts.failed > 0) {
      console.log("⚠️ 任务失败，请检查错误日志");
    } else if (ocrCounts.active > 0) {
      console.log("⏳ 任务仍在处理中");
    } else {
      console.log("❓ 任务可能没有被正确添加");
    }
  } catch (error) {
    console.error("❌ 测试失败:", error);
    console.error("Stack:", error.stack);
  }

  // 退出程序
  process.exit(0);
}

// 运行测试
testCompleteFlow().catch(console.error);
