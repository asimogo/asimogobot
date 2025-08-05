import axios from 'axios';
function extractTitleFromMarkdown(md: string): string {
    const lines = md.split('\n');
    const titleLine = lines.find(line => line.startsWith('#'));
    return titleLine ? titleLine.replace(/^#+\s*/, '').trim() : `润色内容 ${new Date().toLocaleString()}`;
}

function markdownToNotionBlocks(md: string): any[] {
    const lines = md.split('\n');
    const blocks: any[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    for (const line of lines) {
        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBuffer = [];
            } else {
                inCodeBlock = false;
                blocks.push({
                    object: 'block',
                    type: 'code',
                    code: {
                        rich_text: [{ type: 'text', text: { content: codeBuffer.join('\n') } }],
                        language: 'plain text'
                    }
                });
            }
        } else if (inCodeBlock) {
            codeBuffer.push(line);
        } else if (line.startsWith('# ')) {
            blocks.push({
                object: 'block',
                type: 'heading_1',
                heading_1: { rich_text: [{ type: 'text', text: { content: line.replace(/^#\s*/, '') } }] }
            });
        } else if (line.startsWith('## ')) {
            blocks.push({
                object: 'block',
                type: 'heading_2',
                heading_2: { rich_text: [{ type: 'text', text: { content: line.replace(/^##\s*/, '') } }] }
            });
        } else if (line.startsWith('- ')) {
            blocks.push({
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [{ type: 'text', text: { content: line.replace(/^-\s*/, '') } }]
                }
            });
        } else if (line.trim() !== '') {
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ type: 'text', text: { content: line } }]
                }
            });
        }
    }

    return blocks;
}

export async function handleNotion(markdown: string): Promise<void> {
    const title = extractTitleFromMarkdown(markdown);
    const children = markdownToNotionBlocks(markdown);

    children.unshift({
        object: 'block',
        type: 'paragraph',
        paragraph: {
            rich_text: [
                {
                    type: 'text',
                    text: { content: `作者：ASIMOGO\n保存时间：${new Date().toLocaleString()}` }
                }
            ]
        }
    });

    await axios.post(`https://api.notion.com/v1/pages`, {
        parent: {
            page_id: process.env.NOTION_PAGE_ID,
        },
        properties: {
            title: {
                title: [
                    {
                        text: {
                            content: title
                        }
                    }
                ]
            }
        },
        children
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
        }
    });
}
