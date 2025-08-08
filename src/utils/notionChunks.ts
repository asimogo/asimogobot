// utils/notionChunks.ts
export function chunkText(input: string, max = 1900): string[] {
    const out: string[] = [];
    for (let i = 0; i < input.length; i += max) out.push(input.slice(i, i + max));
    return out;
}

export function toParagraphBlocks(text: string) {
    return chunkText(text).map((part) => ({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: part } }] },
    }));
}

export function toCodeBlocks(longText: string, language: "plain text" | "markdown" = "plain text") {
    return chunkText(longText).map((part) => ({
        object: "block",
        type: "code",
        code: {
            language,
            rich_text: [{
                type: "text",
                text: {
                    content: part
                }
            }]
        }
    }));
}
