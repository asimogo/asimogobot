import { callMcp } from './mcp-client.js';
import { logger } from './logger.js';

const METASO_ENDPOINT = process.env.METASO_MCP_URL!;
const METASO_API_KEY = process.env.METASO_API_KEY;

export async function fetchWechatMarkdown(link: string): Promise<string> {
  try {
    const options = METASO_API_KEY
      ? { endpoint: METASO_ENDPOINT, apiKey: METASO_API_KEY }
      : { endpoint: METASO_ENDPOINT };
    const data = await callMcp<{ markdown?: string; content?: string; }>(
      options,
      { url: link, format: 'markdown' }
    );
    return data.markdown || data.content || '';
  } catch (err) {
    logger.error('metaso 调用失败', err);
    throw err;
  }
}
