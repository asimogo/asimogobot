// src/utils/tg.ts
import { Api } from "grammy";

export async function downloadFileBuffer(api: Api, fileId: string, botToken: string): Promise<Buffer> {
    const file = await api.getFile(fileId);
    if (!file.file_path) throw new Error("file_path missing");
    const link = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
    const rsp = await fetch(link);
    if (!rsp.ok) throw new Error(`download failed: ${rsp.status}`);
    const arr = new Uint8Array(await rsp.arrayBuffer());
    return Buffer.from(arr);
}