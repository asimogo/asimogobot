# 百度 OCR 配置说明

本项目支持两种百度 OCR API 调用方式，您可以根据自己的需求选择合适的配置方式。

## 方式 1: 使用 Access Token (推荐)

这是最简单的方式，只需要一个 access_token 即可。

### 配置步骤：

1. 访问 [百度 AI 开放平台](https://ai.baidu.com/)
2. 创建应用并开通 OCR 服务
3. 获取 access_token
4. 在 `.env` 文件中配置：
   ```bash
   BAIDU_OCR_TOKEN=your_access_token_here
   USE_BAIDU_APP_SECRET_MODE=false
   ```

### 特点：

- 配置简单，只需要一个 token
- 自动处理 token 过期和刷新
- 使用通用文字识别 API，识别准确率高

## 方式 2: 使用 AppID + Secret

这种方式需要配置 appid 和 secret，但提供了更多的控制选项。

### 配置步骤：

1. 访问 [百度 AI 开放平台](https://ai.baidu.com/)
2. 创建应用并开通 OCR 服务
3. 获取 AppID 和 Secret Key
4. 在 `.env` 文件中配置：
   ```bash
   BAIDU_APPID=your_baidu_app_id
   BAIDU_SECRET=your_baidu_secret_key
   USE_BAIDU_APP_SECRET_MODE=true
   ```

### 特点：

- 使用图片翻译 OCR API
- 支持多语言识别
- 可以自定义识别参数
- 需要手动管理签名和加密

## 环境变量配置

确保在 `.env` 文件中包含以下配置：

```bash
# 方式1: Access Token 模式
BAIDU_OCR_TOKEN=your_access_token_here
USE_BAIDU_APP_SECRET_MODE=false

# 方式2: AppID + Secret 模式
BAIDU_APPID=your_baidu_app_id
BAIDU_SECRET=your_baidu_secret_key
USE_BAIDU_APP_SECRET_MODE=true
```

## 注意事项

1. **两种方式不能同时使用**：请确保只配置一种方式
2. **Access Token 模式**：如果配置了 `BAIDU_OCR_TOKEN`，建议设置 `USE_BAIDU_APP_SECRET_MODE=false`
3. **AppID + Secret 模式**：如果配置了 `BAIDU_APPID` 和 `BAIDU_SECRET`，需要设置 `USE_BAIDU_APP_SECRET_MODE=true`
4. **API 限制**：两种方式都有相应的 API 调用限制，请参考百度 AI 开放平台的官方文档

## 故障排除

### 常见错误：

1. **"缺少百度 OCR 的 APPID 或 SECRET 配置"**

   - 检查是否设置了 `BAIDU_APPID` 和 `BAIDU_SECRET`
   - 确认 `USE_BAIDU_APP_SECRET_MODE=true`

2. **"OCR 识别失败或格式异常"**

   - 检查网络连接
   - 确认 API 密钥是否有效
   - 检查图片格式是否支持

3. **"Baidu OCR error: 401"**
   - 检查 access_token 是否过期
   - 确认 API 密钥是否正确

## 技术实现

项目中的 `BaiduOCRClient` 类支持两种调用方式：

- `recognize(imageBase64: string)`: 使用 access_token 调用通用文字识别
- `recognizeWithAppSecret(buffer: Buffer)`: 使用 appid + secret 调用图片翻译 OCR

系统会根据 `USE_BAIDU_APP_SECRET_MODE` 配置自动选择合适的方法。
