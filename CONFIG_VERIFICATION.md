# 配置验证说明

## 百度 OCR 配置格式验证

根据百度官方 API 文档，本项目已正确配置了以下环境变量格式：

### ✅ 正确的配置格式

```bash
# 方式1: Access Token 模式 (推荐)
BAIDU_OCR_TOKEN=your_baidu_access_token_here
USE_BAIDU_APP_SECRET_MODE=false

# 方式2: AppID + Secret 模式
BAIDU_APPID=your_baidu_app_id
BAIDU_SECRET=your_baidu_secret_key
USE_BAIDU_APP_SECRET_MODE=true
```

### 🔍 配置验证清单

请确保您的 `.env` 文件中包含以下配置：

#### 必需配置 (选择其中一种方式)

**方式1 - Access Token:**
- [ ] `BAIDU_OCR_TOKEN` - 百度 OCR access token
- [ ] `USE_BAIDU_APP_SECRET_MODE=false`

**方式2 - AppID + Secret:**
- [ ] `BAIDU_APPID` - 百度应用 ID
- [ ] `BAIDU_SECRET` - 百度应用密钥
- [ ] `USE_BAIDU_APP_SECRET_MODE=true`

#### 其他必需配置
- [ ] `BOT_TOKEN` - Telegram Bot Token
- [ ] `DEEPSEEK_API_KEY` - DeepSeek AI API Key
- [ ] `REDIS_URL` - Redis 连接地址 (可选，默认 localhost:6379)

### 🚨 重要提醒

1. **不要同时配置两种方式**：选择一种 OCR 方式即可
2. **格式必须完全匹配**：环境变量名称必须与上述格式完全一致
3. **值不要加引号**：在 `.env` 文件中直接写值，不要加引号
4. **重启应用**：配置更改后必须重启应用才能生效

### 🧪 测试配置

运行以下命令测试配置是否正确：

```bash
# 测试 OCR 功能
node test-ocr.js

# 或者启动应用
npm run dev
```

### 📚 相关文档

- [OCR 配置说明](./OCR_CONFIG.md)
- [环境变量示例](./.env.example)
- [百度 AI 开放平台](https://ai.baidu.com/)

### 🆘 常见问题

**Q: 为什么我的 OCR 不工作？**
A: 请检查：
1. 环境变量名称是否正确
2. 是否选择了正确的 OCR 模式
3. API 密钥是否有效
4. 是否重启了应用

**Q: 如何切换 OCR 模式？**
A: 修改 `.env` 文件中的 `USE_BAIDU_APP_SECRET_MODE` 值，然后重启应用

**Q: 支持哪些图片格式？**
A: 支持 JPG、PNG、BMP 等常见图片格式
