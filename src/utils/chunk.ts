export function splitTextIntoChunks(text: string, max: number = 3500): string[] {

    const chunks: string[] = [];
    let rest = text.trim();
    while (rest.length > max) {
        let idx = rest.lastIndexOf("\n", max);
        if (idx < max * 0.6) idx = rest.lastIndexOf("", max);
        if (idx < 0) idx = max;
        chunks.push(rest.slice(0, idx));
        rest = rest.slice(idx);

    }
    if (rest) chunks.push(rest);
    return chunks;
}