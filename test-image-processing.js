// 测试图片处理功能的脚本
import dotenv from "dotenv";
import { TaskQueue } from "./src/queue/queues.js";

dotenv.config();

async function testImageProcessing() {
  console.log("🧪 测试图片处理功能...\n");

  // 检查环境变量
  const botToken = process.env.BOT_TOKEN;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const baiduAccessToken = process.env.BAIDU_OCR_TOKEN;
  const baiduAppId = process.env.BAIDU_APPID;
  const baiduSecret = process.env.BAIDU_SECRET;
  const useAppSecretMode = process.env.USE_BAIDU_APP_SECRET_MODE === "true";

  console.log("📋 当前配置:");
  console.log(`  - Bot Token: ${botToken ? "✅ 已配置" : "❌ 未配置"}`);
  console.log(`  - DeepSeek Key: ${deepseekKey ? "✅ 已配置" : "❌ 未配置"}`);
  console.log(
    `  - Baidu Access Token: ${baiduAccessToken ? "✅ 已配置" : "❌ 未配置"}`,
  );
  console.log(`  - Baidu App ID: ${baiduAppId ? "✅ 已配置" : "❌ 未配置"}`);
  console.log(`  - Baidu Secret: ${baiduSecret ? "✅ 已配置" : "❌ 未配置"}`);
  console.log(
    `  - 使用App Secret模式: ${useAppSecretMode ? "✅ 是" : "❌ 否"}`,
  );
  console.log("");

  if (!botToken || !deepseekKey || !baiduAccessToken) {
    console.log("❌ 错误: 缺少必要的配置");
    console.log("请检查 .env 文件中的配置");
    return;
  }

  try {
    // 创建模拟的API对象
    const mockApi = {
      sendMessage: () => Promise.resolve(),
      sendChatAction: () => Promise.resolve(),
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

    // 检查队列状态
    console.log("\n🔍 队列状态:");
    console.log(
      `  - Text Queue: ${taskQueue.textQueue ? "✅ 已创建" : "❌ 未创建"}`,
    );
    console.log(
      `  - OCR Queue: ${taskQueue.ocrQueue ? "✅ 已创建" : "❌ 未创建"}`,
    );

    // 测试添加任务
    console.log("\n🧪 测试任务添加:");

    // 测试文本任务
    try {
      const textJob = await taskQueue.add("text", {
        taskId: "test-text-123",
        chatId: 123456,
        userId: 789012,
        text: "测试文本",
        mode: "PROCESS",
      });
      console.log(`  - 文本任务: ✅ 已添加 (ID: ${textJob.id})`);
    } catch (error) {
      console.log(`  - 文本任务: ❌ 添加失败 - ${error.message}`);
    }

    // 测试OCR任务
    try {
      const ocrJob = await taskQueue.add("ocr-single", {
        taskId: "test-ocr-123",
        chatId: 123456,
        userId: 789012,
        fileId: "test_file_id",
      });
      console.log(`  - OCR任务: ✅ 已添加 (ID: ${ocrJob.id})`);
    } catch (error) {
      console.log(`  - OCR任务: ❌ 添加失败 - ${error.message}`);
    }

    console.log("\n✅ 图片处理功能测试完成！");
    console.log("\n💡 提示:");
    console.log("  - 如果任务添加成功，说明队列配置正确");
    console.log("  - 如果任务添加失败，请检查Redis连接和配置");
    console.log("  - 实际运行时需要启动worker来处理任务");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

// 运行测试
testImageProcessing().catch(console.error);
