// handlers/handleNotion.ts
import axios from "axios";
import { toParagraphBlocks, toCodeBlocks } from "../utils/notionChunks.js";

/**
 * 规则说明（核心防错）：
 * - Notion 对 rich_text[].text.content 有长度上限（~2000 字符）。
 * - 我们把任何可能超长的段落/代码，切成多个 block（每块只放一个短 rich_text）。
 * - 标题/列表通常很短，仍做长度兜底。
 */

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID!;
const NOTION_VERSION = "2022-06-28";

const MAX_RICH = 1900; // 留余量，低于 2000

function extractTitleFromMarkdown(md: string): string {
    const lines = md.split("\n");
    const titleLine = lines.find((line) => line.startsWith("#"));
    const title =
        titleLine?.replace(/^#+\s*/, "").trim() ??
        `润色内容 ${new Date().toLocaleString()}`;
    // Notion 标题别太长，截断到 ~180 字符
    return title.slice(0, 180);
}

/** 把一段很长的文本切成多个 paragraph blocks（每块 ≤ MAX_RICH） */
function chunkParagraphToBlocks(text: string) {
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
    return toParagraphBlocks(text); // 你已经实现：按 1900 分片
}

/** 把一段很长的代码切成多个 code blocks（每块 ≤ MAX_RICH） */
function chunkCodeToBlocks(code: string, language = "plain text") {
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
function markdownToNotionBlocks(md: string): any[] {
    const lines = md.split("\n");
    const blocks: any[] = [];

    let inCode = false;
    let codeBuffer: string[] = [];
    let codeLang = "plain text";

    const flushCode = () => {
        if (!codeBuffer.length) return;
        const codeText = codeBuffer.join("\n");
        blocks.push(...chunkCodeToBlocks(codeText, codeLang));
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
        blocks.push(...chunkParagraphToBlocks(line));
    }

    // 文件结束仍在代码块中：flush 一下
    if (inCode) flushCode();

    return blocks;
}

export async function handleNotion(markdown: string): Promise<void> {
    if (!NOTION_API_KEY || !NOTION_PAGE_ID) {
        throw new Error("缺少 NOTION_API_KEY 或 NOTION_PAGE_ID 环境变量。");
    }

    const title = extractTitleFromMarkdown(markdown);
    const now = new Date().toLocaleString();

    const headerMeta = `作者：ASIMOGO\n保存时间：${now}`;

    // 先插入元信息（自动分片）
    const children: any[] = [
        ...chunkParagraphToBlocks(headerMeta),
        ...markdownToNotionBlocks(markdown),
    ];

    const body = {
        parent: { page_id: NOTION_PAGE_ID },
        properties: {
            title: {
                title: [{ text: { content: title } }],
            },
        },
        children,
    };

    await axios.post("https://api.notion.com/v1/pages", body, {
        headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
        },
        // 可选：超时/重试在此加
    });
}
