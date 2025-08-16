# 问题排查指南

## 🔍 常见问题及解决方案

### 1. 网络连接问题

#### 问题描述

```
HttpError: Network request for 'sendMessage' failed!
ETIMEDOUT
```

#### 原因分析

- Telegram API 网络连接超时
- 网络不稳定
- 防火墙或代理问题

#### 解决方案

✅ **已全面优化**：系统现在包含完整的网络容错机制

**自动重试机制**：

- 🔄 结果发送：自动重试 3 次，指数退避（2s, 4s, 8s）
- 🔄 回调处理：保存操作后的回复重试机制
- 🔄 Notion API：网络错误自动重试（跳过 4xx 客户端错误）
- ⏱️ 多片段发送间隔（500ms）
- 💬 发送失败时提供用户友好错误提示

**网络错误处理层级**：

1. **Result Handler** - 主要结果发送
2. **Callback Handler** - 按钮回调处理
3. **Notion API** - 第三方 API 调用
4. **Bot Global** - 全局错误捕获

**手动排查**：

1. 检查网络连接
2. 确认 Telegram API 可访问性
3. 检查防火墙设置
4. 考虑使用代理（如需要）

### 2. Notion API 问题

#### 常见错误码

**401 Unauthorized**

```bash
Notion API错误: 401 - Invalid token
```

- 检查 `NOTION_API_KEY` 是否正确
- 确认 token 以 `secret_` 开头
- 重新生成 Integration token

**404 Not Found**

```bash
Notion API错误: 404 - Page not found
```

- 检查 `NOTION_PAGE_ID` 是否正确
- 确认 Integration 已被邀请到目标页面
- 验证页面 ID 格式（32 位字符）

**400 Bad Request**

```bash
Notion API错误: 400 - Invalid request
```

- 检查页面权限
- 确认页面类型正确
- 验证内容格式

### 3. 百度 OCR 问题

#### 签名错误

```bash
❌ OCR识别失败或格式异常
```

- 检查 `BAIDU_APPID` 和 `BAIDU_SECRET` 配置
- 确认签名算法正确
- 验证时间戳是否同步

#### API 限制

```bash
API调用超过限制
```

- 检查百度 OCR 配额
- 调整请求频率
- 升级服务套餐

### 4. DeepSeek API 问题

#### 令牌错误

```bash
❌ DeepSeek Error: 401
```

- 检查 `DEEPSEEK_API_KEY` 配置
- 确认 API key 有效性
- 验证余额是否充足

#### 内容过滤

```bash
DeepSeek内容被过滤
```

- 检查输入内容是否违规
- 调整 prompt 模板
- 使用内容预处理

### 5. Redis 连接问题

#### 连接失败

```bash
Redis connection failed
```

- 检查 Redis 服务状态
- 确认连接配置
- 验证端口和密码

### 6. 队列处理问题

#### 任务卡住

- 检查 worker 状态
- 清理失败任务
- 重启队列服务

#### 内存泄漏

- 监控内存使用
- 检查任务清理
- 调整队列配置

## 🛠️ 调试工具

### 1. 日志分析

**启用详细日志**：

```bash
npm run dev
```

**关键日志标识**：

- 🔍 - 调试信息
- ✅ - 成功操作
- ❌ - 错误信息
- 🟢 - 队列事件

### 2. 状态检查

**使用 status 命令**：

```
/status
```

显示：

- 用户状态（忙碌/空闲）
- 队列统计
- 任务计数

### 3. 配置验证

**检查环境变量**：

```bash
# 查看配置状态
node -e "
console.log('BOT_TOKEN:', process.env.BOT_TOKEN ? '✅' : '❌');
console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✅' : '❌');
console.log('BAIDU_APPID:', process.env.BAIDU_APPID ? '✅' : '❌');
console.log('BAIDU_SECRET:', process.env.BAIDU_SECRET ? '✅' : '❌');
console.log('NOTION_API_KEY:', process.env.NOTION_API_KEY ? '✅' : '❌');
console.log('NOTION_PAGE_ID:', process.env.NOTION_PAGE_ID ? '✅' : '❌');
"
```

## 🚀 性能优化

### 1. 网络优化

- 使用 CDN 或代理
- 调整超时设置
- 实现连接池

### 2. 内存优化

- 定期清理缓存
- 优化图片处理
- 调整队列大小

### 3. 处理速度

- 并行处理
- 缓存机制
- 预加载资源

## 📋 监控建议

### 1. 关键指标

- API 响应时间
- 错误率
- 队列积压
- 内存使用

### 2. 告警设置

- 连续失败超过阈值
- 队列积压过多
- 内存使用过高
- API 配额耗尽

### 3. 日志保留

- 错误日志：7 天
- 调试日志：1 天
- 审计日志：30 天

## 🆘 紧急恢复

### 1. 服务重启

```bash
# 停止服务
pm2 stop telegram-bot

# 清理进程
pm2 delete telegram-bot

# 重新启动
npm run start
```

### 2. 队列清理

```bash
# 连接Redis
redis-cli

# 清理失败任务
FLUSHDB

# 重启队列worker
```

### 3. 数据恢复

- 检查 Redis 持久化
- 恢复用户状态
- 重新处理失败任务

如果问题仍然存在，请检查日志文件并联系技术支持。
