import axios from 'axios';

export interface McpOptions {
  endpoint: string;
  apiKey?: string;
}

export async function callMcp<T = any>(opts: McpOptions, payload: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.apiKey) {
    headers['Authorization'] = `Bearer ${opts.apiKey}`;
  }

  const resp = await axios.post(opts.endpoint, payload, { headers });
  return resp.data as T;
}
