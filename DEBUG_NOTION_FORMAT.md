# Notion 格式问题排查指南

## 🔍 问题描述

在保存到 Notion 时，有时内容显示为正常的 Markdown 格式文章，有时却显示为整个 Markdown 文本块。

## 🔧 问题原因分析

### 1. DeepSeek 返回格式不一致

DeepSeek API 有时会返回两种不同的格式：

**格式 A：直接返回 Markdown**

```
# 标题
这是正常的段落内容。

## 子标题
- 列表项1
- 列表项2
```

**格式 B：被代码块包裹的 Markdown**

````
```markdown
# 标题
这是被代码块包裹的Markdown内容。

## 子标题
- 列表项1
- 列表项2
```
````

或者：

````
```
# 标题
这是被通用代码块包裹的内容。
```
````

### 2. Notion 处理差异

- **格式 A**：正确解析为结构化的 Notion 块（标题、段落、列表等）
- **格式 B**：被当作代码块处理，显示为单个 Markdown 文本块

## ✅ 解决方案

### 1. 文本预处理 (`preprocessText`)

在 Notion 保存之前，自动检测并处理被代码块包裹的内容：

````typescript
private preprocessText(text: string): string {
    const trimmed = text.trim();

    // 检查markdown代码块包裹
    if (trimmed.startsWith('```markdown') && trimmed.endsWith('```')) {
        return trimmed.slice(11, -3).trim();
    }

    // 检查通用代码块包裹
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
        const firstNewline = trimmed.indexOf('\n');
        if (firstNewline > 0) {
            return trimmed.slice(firstNewline + 1, -3).trim();
        } else {
            return trimmed.slice(3, -3).trim();
        }
    }

    return text;
}
````

### 2. 增强的 Markdown 解析

支持更多 Markdown 元素：

- ✅ H1-H3 标题 (`#`, `##`, `###`)
- ✅ 无序列表 (`-`)
- ✅ 代码块 (`lang...`)
- ✅ 段落自动分片
- ✅ 空行处理

### 3. 详细调试日志

添加了完整的调试信息：

- 文本预处理状态
- 是否检测到代码块包裹
- Markdown 解析过程
- 生成的块数量和类型

## 🧪 测试方法

### 1. 观察日志输出

在保存到 Notion 时，查看日志：

````
🔍 [NotionAPI] 文本前100字符: "```markdown\n# 标题..."
🔍 [NotionAPI] 是否被代码块包裹: true
🔍 [NotionAPI] 检测到markdown代码块包裹，提取内容
🔍 [NotionAPI] 预处理后文本长度: 1234
🔍 [NotionAPI] 开始解析Markdown，总行数: 15
🔍 [NotionAPI] 添加H1标题: "标题..."
🔍 [NotionAPI] 添加了 2 个段落块: "这是段落内容..."
🔍 [NotionAPI] Markdown解析完成，总共生成 8 个块
````

### 2. 验证 Notion 结果

- **修复前**：整个内容显示为一个代码块
- **修复后**：内容正确显示为标题、段落、列表等结构化元素

## 📋 验证清单

- [ ] 文本预处理正确提取被包裹的内容
- [ ] Markdown 元素正确解析为 Notion 块
- [ ] 日志显示详细的处理过程
- [ ] Notion 中显示为结构化内容而非代码块

## 🚀 下一步优化

如果问题仍然存在，可以考虑：

1. **优化 DeepSeek Prompt**：调整 prompt 确保返回格式一致
2. **增加更多 Markdown 支持**：有序列表、引用块、表格等
3. **智能格式检测**：基于内容特征自动判断处理方式

这个修复确保了无论 DeepSeek 返回什么格式，Notion 都能正确显示为结构化的文档！
