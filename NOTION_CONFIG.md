# Notion 配置说明

本项目支持将处理后的文本保存到 Notion 数据库中，支持 Markdown 格式解析和自动分块处理。

## 🔧 配置步骤

### 1. 创建 Notion Integration

1. 访问 [Notion Developers](https://www.notion.so/my-integrations)
2. 点击 "New integration"
3. 填写 Integration 名称（如：AsIMOGo Bot）
4. 选择关联的 workspace
5. 创建后获得 `Integration Token`

### 2. 创建目标页面

1. 在 Notion 中创建一个新页面（作为保存内容的父页面）
2. 点击页面右上角的 "Share"
3. 点击 "Invite" 并搜索你刚创建的 Integration
4. 添加 Integration 并给予 "Can edit" 权限
5. 复制页面 URL 中的页面 ID

**页面 URL 格式**：

```
https://www.notion.so/Your-Page-Title-{PAGE_ID}?v=...
```

### 3. 配置环境变量

在 `.env` 文件中添加：

```bash
# Notion API Configuration
NOTION_API_KEY=secret_your_notion_integration_token
NOTION_PAGE_ID=your_notion_page_id
```

**示例**：

```bash
NOTION_API_KEY=secret_ABC123def456GHI789jkl012MNO345pqr678STU901vwx
NOTION_PAGE_ID=12345678-1234-5678-9012-123456789abc
```

## 📝 功能特点

### 支持的 Markdown 语法

- ✅ **标题**：`# 一级标题`、`## 二级标题`
- ✅ **段落**：普通文本段落
- ✅ **列表**：`- 无序列表项`
- ✅ **代码块**：`lang ... `
- ✅ **自动分块**：长文本自动分割为多个块

### 自动处理功能

1. **长度限制处理**：

   - 自动检测超长内容（>1900 字符）
   - 智能分割为多个 Notion 块
   - 保持内容完整性

2. **元信息添加**：

   - 自动添加作者信息
   - 保存时间戳
   - 从内容中提取标题

3. **格式优化**：
   - Markdown 到 Notion 块的转换
   - 代码语言检测
   - 空行处理

## 🎯 使用方式

当用户发送文本或图片并获得处理结果后：

1. 点击 "保存到 Notion" 按钮
2. 系统自动将内容保存到配置的 Notion 页面
3. 在 Notion 中会创建一个新的子页面
4. 包含处理后的内容和元信息

## 🔍 故障排除

### 常见错误

**1. "缺少 NOTION_API_KEY 或 NOTION_PAGE_ID 环境变量"**

- 检查 `.env` 文件中的配置
- 确保环境变量名称正确

**2. "Notion API 错误: 401"**

- 检查 Integration Token 是否正确
- 确认 Token 以 `secret_` 开头

**3. "Notion API 错误: 404"**

- 检查页面 ID 是否正确
- 确认 Integration 已被邀请到目标页面

**4. "网络连接失败"**

- 检查网络连接
- 确认防火墙设置

### 调试方法

启用详细日志查看处理过程：

```bash
npm run dev
```

日志会显示：

- 配置检查状态
- 内容块生成数量
- API 请求和响应
- 错误详细信息

## 📋 权限要求

Integration 需要以下权限：

- ✅ **Read content** - 读取页面内容
- ✅ **Insert content** - 创建新页面
- ✅ **Update content** - 编辑页面内容

## 🎨 内容格式示例

保存到 Notion 的内容格式：

````
作者：ASIMOGO
保存时间：2024-01-15 10:30:00

# 处理结果标题

这是经过 DeepSeek 处理后的内容...

## 主要观点

- 观点一
- 观点二

```python
# 代码示例
def example():
    return "Hello World"
````

````

## 🚀 高级配置

### 自定义 Notion 版本

在代码中可以修改 API 版本：

```typescript
const NOTION_VERSION = "2022-06-28";  // 默认版本
````

### 自定义分块大小

```typescript
const MAX_RICH = 1900; // 每块最大字符数
```

这样配置完成后，用户就可以通过 Telegram Bot 将处理后的内容直接保存到 Notion 中了！
