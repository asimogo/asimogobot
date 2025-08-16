// 测试OCR功能的简单脚本
import dotenv from "dotenv";
import { BaiduOCRClient } from "./src/services/baidu-ocr.js";

dotenv.config();

async function testOCR() {
  console.log("🧪 测试百度OCR功能...\n");

  // 测试配置
  const accessToken = process.env.BAIDU_OCR_TOKEN;
  const appId = process.env.BAIDU_APPID;
  const secret = process.env.BAIDU_SECRET;
  const useAppSecretMode = process.env.USE_BAIDU_APP_SECRET_MODE === "true";

  console.log("📋 当前配置:");
  console.log(`  - Access Token: ${accessToken ? "✅ 已配置" : "❌ 未配置"}`);
  console.log(`  - App ID: ${appId ? "✅ 已配置" : "❌ 未配置"}`);
  console.log(`  - Secret: ${secret ? "✅ 已配置" : "❌ 未配置"}`);
  console.log(
    `  - 使用App Secret模式: ${useAppSecretMode ? "✅ 是" : "❌ 否"}`,
  );
  console.log("");

  if (!accessToken && (!appId || !secret)) {
    console.log("❌ 错误: 缺少必要的OCR配置");
    console.log("请检查 .env 文件中的配置");
    return;
  }

  try {
    // 创建OCR客户端
    const ocrClient = new BaiduOCRClient(accessToken || "", appId, secret);
    console.log("✅ OCR客户端创建成功");

    // 测试方法可用性
    console.log("\n🔍 测试方法可用性:");
    console.log(
      `  - recognize方法: ${
        typeof ocrClient.recognize === "function" ? "✅ 可用" : "❌ 不可用"
      }`,
    );
    console.log(
      `  - recognizeWithAppSecret方法: ${
        typeof ocrClient.recognizeWithAppSecret === "function"
          ? "✅ 可用"
          : "❌ 不可用"
      }`,
    );

    console.log("\n✅ OCR功能测试完成！");
    console.log("\n💡 提示:");
    if (useAppSecretMode) {
      console.log("  - 当前使用App ID + Secret模式");
      console.log("  - 确保已配置BAIDU_APPID和BAIDU_SECRET");
    } else {
      console.log("  - 当前使用Access Token模式");
      console.log("  - 确保已配置BAIDU_OCR_TOKEN");
    }
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

// 运行测试
testOCR().catch(console.error);
