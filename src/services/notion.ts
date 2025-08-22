// src/services/notion.ts
import axios from "axios";
import { toParagraphBlocks, toCodeBlocks } from "../utils/notion-chunks.js";

/**
 * 规则说明（核心防错）：
 * - Notion 对 rich_text[].text.content 有长度上限（~2000 字符）。
 * - 我们把任何可能超长的段落/代码，切成多个 block（每块只放一个短 rich_text）。
 * - 标题/列表通常很短，仍做长度兜底。
 */

const NOTION_VERSION = "2022-06-28";
const MAX_RICH = 1900; // 留余量，低于 2000

export class NotionAPI {
    private apiKey: string;
    private pageId: string;

    constructor() {
        this.apiKey = process.env.NOTION_API_KEY || '';
        this.pageId = process.env.NOTION_PAGE_ID || '';

        console.log("🔍 [NotionAPI] 初始化配置:");
        console.log(`  - API Key: ${this.apiKey ? '已设置' : '未设置'}`);
        console.log(`  - Page ID: ${this.pageId ? '已设置' : '未设置'}`);
    }

    /**
     * 预处理文本：处理DeepSeek有时返回被代码块包裹的内容
     */
    private preprocessText(text: string): string {
        const trimmed = text.trim();

        // 检查是否被markdown代码块包裹
        if (trimmed.startsWith('```markdown') && trimmed.endsWith('```')) {
            console.log("🔍 [NotionAPI] 检测到markdown代码块包裹，提取内容");
            // 提取 ```markdown 和 ``` 之间的内容
            return trimmed.slice(11, -3).trim();
        }

        // 检查是否被通用代码块包裹
        if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
            console.log("🔍 [NotionAPI] 检测到通用代码块包裹，提取内容");
            // 查找第一个换行符（代码块语言标识之后）
            const firstNewline = trimmed.indexOf('\n');
            if (firstNewline > 0) {
                // 提取语言标识后的内容到结尾```之前
                return trimmed.slice(firstNewline + 1, -3).trim();
            } else {
                // 没有语言标识，直接提取```之间的内容
                return trimmed.slice(3, -3).trim();
            }
        }

        return text;
    }

    private async postWithRetry(url: string, data: any, config: any, maxRetries: number = 3): Promise<any> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await axios.post(url, data, config);
            } catch (error: any) {
                console.error(`❌ [NotionAPI] 请求失败 (尝试 ${attempt}/${maxRetries}):`, error?.message || error);

                // 对于客户端错误（4xx），不要重试
                if (error.response && error.response.status >= 400 && error.response.status < 500) {
                    throw error;
                }

                if (attempt === maxRetries) {
                    throw error;
                }

                const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`🔍 [NotionAPI] 等待 ${waitTime}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    private extractTitleFromMarkdown(md: string): string {
        const lines = md.split("\n");
        const titleLine = lines.find((line) => line.startsWith("#"));
        const title =
            titleLine?.replace(/^#+\s*/, "").trim() ??
            `润色内容 ${new Date().toLocaleString()}`;
        // Notion 标题别太长，截断到 ~180 字符
        return title.slice(0, 180);
    }

    /** 把一段很长的文本切成多个 paragraph blocks（每块 ≤ MAX_RICH） */
    private chunkParagraphToBlocks(text: string) {
        if (!text) return [];
        if (text.length <= MAX_RICH) {
            return [
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: { rich_text: [{ type: "text", text: { content: text } }] },
                },
            ];
        }
        return toParagraphBlocks(text); // 按 1900 分片
    }

    /** 把一段很长的代码切成多个 code blocks（每块 ≤ MAX_RICH） */
    private chunkCodeToBlocks(code: string, language = "plain text") {
        if (!code) return [];
        if (code.length <= MAX_RICH) {
            return [
                {
                    object: "block",
                    type: "code",
                    code: {
                        language,
                        rich_text: [{ type: "text", text: { content: code } }],
                    },
                },
            ];
        }
        return toCodeBlocks(code, language as "plain text" | "markdown");
    }

    /**
     * 轻量 Markdown -> Notion blocks
     * 支持：
     *  - # / ## 标题
     *  - - 无序列表
     *  - ```lang ... ``` 代码块（自动分片）
     *  - 其余行按 paragraph（自动分片）
     */
    private markdownToNotionBlocks(md: string): any[] {
        console.log(`🔍 [NotionAPI] 开始解析Markdown，总行数: ${md.split("\n").length}`);

        const lines = md.split("\n");
        const blocks: any[] = [];

        let inCode = false;
        let codeBuffer: string[] = [];
        let codeLang = "plain text";
        let blockCount = 0;

        const flushCode = () => {
            if (!codeBuffer.length) return;
            const codeText = codeBuffer.join("\n");
            const codeBlocks = this.chunkCodeToBlocks(codeText, codeLang);
            blocks.push(...codeBlocks);
            console.log(`🔍 [NotionAPI] 添加了 ${codeBlocks.length} 个代码块`);
            blockCount += codeBlocks.length;
            codeBuffer = [];
            codeLang = "plain text";
        };

        for (const raw of lines) {
            const line = raw ?? "";

            // 代码块围栏
            if (line.trim().startsWith("```")) {
                if (!inCode) {
                    inCode = true;
                    codeBuffer = [];
                    // 解析语言：```lang
                    const lang = line.trim().slice(3).trim().toLowerCase();
                    if (lang === "markdown") {
                        codeLang = "markdown";
                    } else {
                        codeLang = lang || "plain text";
                    }
                } else {
                    inCode = false;
                    flushCode();
                }
                continue;
            }

            if (inCode) {
                codeBuffer.push(line);
                continue;
            }

            // 标题
            if (line.startsWith("# ")) {
                const text = line.replace(/^#\s*/, "");
                blocks.push({
                    object: "block",
                    type: "heading_1",
                    heading_1: {
                        rich_text: [{ type: "text", text: { content: text.slice(0, MAX_RICH) } }],
                    },
                });
                console.log(`🔍 [NotionAPI] 添加H1标题: "${text.substring(0, 50)}..."`);
                blockCount++;
                continue;
            }
            if (line.startsWith("## ")) {
                const text = line.replace(/^##\s*/, "");
                blocks.push({
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{ type: "text", text: { content: text.slice(0, MAX_RICH) } }],
                    },
                });
                console.log(`🔍 [NotionAPI] 添加H2标题: "${text.substring(0, 50)}..."`);
                blockCount++;
                continue;
            }
            if (line.startsWith("### ")) {
                const text = line.replace(/^###\s*/, "");
                blocks.push({
                    object: "block",
                    type: "heading_3",
                    heading_3: {
                        rich_text: [{ type: "text", text: { content: text.slice(0, MAX_RICH) } }],
                    },
                });
                console.log(`🔍 [NotionAPI] 添加H3标题: "${text.substring(0, 50)}..."`);
                blockCount++;
                continue;
            }

            // 无序列表
            if (line.startsWith("- ")) {
                const item = line.replace(/^-+\s*/, "");
                if (item.length <= MAX_RICH) {
                    blocks.push({
                        object: "block",
                        type: "bulleted_list_item",
                        bulleted_list_item: {
                            rich_text: [{ type: "text", text: { content: item } }],
                        },
                    });
                } else {
                    // 超长列表项就拆成多条
                    const parts = toParagraphBlocks(item);
                    for (const [idx, p] of parts.entries()) {
                        if (idx === 0) {
                            blocks.push({
                                object: "block",
                                type: "bulleted_list_item",
                                bulleted_list_item: p.paragraph,
                            });
                        } else {
                            blocks.push({
                                object: "block",
                                type: "bulleted_list_item",
                                bulleted_list_item: p.paragraph,
                            });
                        }
                    }
                }
                continue;
            }

            // 空行 -> 段落分隔（可选择性忽略）
            if (line.trim() === "") {
                // 插入一个空段，保持可读性（非必须）
                blocks.push({
                    object: "block",
                    type: "paragraph",
                    paragraph: { rich_text: [] },
                });
                continue;
            }

            // 普通段落（自动分片）
            const paragraphBlocks = this.chunkParagraphToBlocks(line);
            blocks.push(...paragraphBlocks);
            if (paragraphBlocks.length > 0 && line.trim()) {
                console.log(`🔍 [NotionAPI] 添加了 ${paragraphBlocks.length} 个段落块: "${line.substring(0, 50)}..."`);
                blockCount += paragraphBlocks.length;
            }
        }

        // 文件结束仍在代码块中：flush 一下
        if (inCode) flushCode();

        console.log(`🔍 [NotionAPI] Markdown解析完成，总共生成 ${blocks.length} 个块 (计数器: ${blockCount})`);
        return blocks;
    }

    async save(text: string, userId: number): Promise<void> {
        console.log(`🔍 [NotionAPI] 开始保存到Notion, 用户ID: ${userId}`);
        console.log(`🔍 [NotionAPI] 文本长度: ${text.length}`);

        // 调试：打印文本前100字符来分析格式
        console.log(`🔍 [NotionAPI] 文本前100字符: "${text.substring(0, 100)}..."`);

        // 检查是否被代码块包裹
        const isWrappedInCodeBlock = text.trim().startsWith('```') && text.trim().endsWith('```');
        console.log(`🔍 [NotionAPI] 是否被代码块包裹: ${isWrappedInCodeBlock}`);

        if (!this.apiKey || !this.pageId) {
            console.error("❌ [NotionAPI] 缺少 NOTION_API_KEY 或 NOTION_PAGE_ID 环境变量");
            throw new Error("缺少 NOTION_API_KEY 或 NOTION_PAGE_ID 环境变量。");
        }

        try {
            // 预处理文本：如果被markdown代码块包裹，则提取内容
            let processedText = this.preprocessText(text);
            console.log(`🔍 [NotionAPI] 预处理后文本长度: ${processedText.length}`);

            const title = this.extractTitleFromMarkdown(processedText);
            const now = new Date().toLocaleString();

            console.log(`🔍 [NotionAPI] 页面标题: "${title}"`);
            console.log(`🔍 [NotionAPI] 保存时间: ${now}`);

            const headerMeta = `作者：ASIMOGO\n保存时间：${now}`;

            // 先插入元信息（自动分片）
            const children: any[] = [
                ...this.chunkParagraphToBlocks(headerMeta),
                ...this.markdownToNotionBlocks(processedText),
            ];

            console.log(`🔍 [NotionAPI] 生成了 ${children.length} 个内容块`);

            // 检查块数量是否超过Notion限制（100个）
            if (children.length > 100) {
                console.warn(`⚠️ [NotionAPI] 块数量 ${children.length} 超过Notion限制100，将截断到99个并添加说明块`);
                const truncatedChildren = children.slice(0, 99);

                // 在最后添加一个说明块（这样总共就是100个块）
                truncatedChildren.push({
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: `⚠️ 注意：由于内容过长，已截断显示。原始内容包含 ${children.length} 个块，当前显示前99个。`
                            }
                        }]
                    }
                });

                console.log(`🔍 [NotionAPI] 截断后块数量: ${truncatedChildren.length}`);
                children.splice(0, children.length, ...truncatedChildren);
            }

            const body = {
                parent: { page_id: this.pageId },
                properties: {
                    title: {
                        title: [{ text: { content: title } }],
                    },
                },
                children,
            };

            console.log("🔍 [NotionAPI] 发送请求到Notion API");
            const response = await this.postWithRetry("https://api.notion.com/v1/pages", body, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    "Notion-Version": NOTION_VERSION,
                },
                timeout: 30000, // 30秒超时
            });

            console.log(`🔍 [NotionAPI] Notion API响应状态: ${response.status}`);
            console.log(`🔍 [NotionAPI] 页面创建成功, ID: ${response.data.id}`);

        } catch (error: any) {
            console.error("❌ [NotionAPI] 保存到Notion失败:", error);

            if (error.response) {
                console.error("❌ [NotionAPI] API错误响应:", {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
                throw new Error(`Notion API错误: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
            } else if (error.request) {
                console.error("❌ [NotionAPI] 网络请求失败");
                throw new Error("网络连接失败，无法访问Notion API");
            } else {
                throw new Error(`Notion保存失败: ${error.message}`);
            }
        }
    }
}