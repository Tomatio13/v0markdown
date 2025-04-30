// 新規ファイル: MCP クライアントとツールを管理
import { experimental_createMCPClient as createMCPClient } from 'ai';
import type { ToolSet } from 'ai';

// MCP_SERVERS_JSON の想定フォーマット
// {
//   "serverKey": { "url": "http://host:port/sse", "headers": { "Authorization": "Bearer ..." } },
//   ...
// }

/**
 * MCP_SERVERS_JSON をパースして、各サーバへ接続しツールをまとめる。
 * ツール名の重複を防ぐため `serverKey/toolName` 形式でリネームする。
 */
export async function getMcpTools(): Promise<{
  tools: ToolSet;
  closeAll: () => Promise<void>;
}> {
  const envVar = process.env.MCP_SERVERS_JSON;
  if (!envVar) {
    return { tools: {}, closeAll: async () => {} };
  }

  let config: Record<string, { url: string; headers?: Record<string, string> }>;
  try {
    config = JSON.parse(envVar);
  } catch (e) {
    console.error('[MCP] MCP_SERVERS_JSON JSON parse error:', e);
    return { tools: {}, closeAll: async () => {} };
  }

  const clients: Array<{ close: () => Promise<void>; tools: ToolSet }> = [];

  await Promise.all(
    Object.entries(config).map(async ([key, value]) => {
      try {
        const client = await createMCPClient({
          transport: {
            type: 'sse',
            url: value.url,
            headers: value.headers,
          },
        });

        const serverTools = await client.tools();
        const renamed: ToolSet = {};
        for (const [tName, tool] of Object.entries(serverTools)) {
          // OpenAI の function name 制約 (^[a-zA-Z0-9_]{1,64}$) を満たすため、
          // サーバキーとツール名をアンダースコア区切りで連結。
          // さらに制限超過時は末尾を切り捨てる。
          const rawName = `${key}_${tName}`.replace(/[^a-zA-Z0-9_]/g, '_');
          const validName = rawName.slice(0, 64);
          renamed[validName] = tool;
        }

        clients.push({ close: () => client.close(), tools: renamed });
      } catch (err) {
        console.error(`[MCP] Failed to init client ${key}:`, err);
      }
    })
  );

  const mergedTools: ToolSet = clients.reduce((acc, cur) => ({ ...acc, ...cur.tools }), {});

  return {
    tools: mergedTools,
    closeAll: async () => {
      for (const c of clients) {
        try {
          await c.close();
        } catch (err) {
          // Edge Runtime では AbortError が発生することがあるため無視する
          console.warn('[MCP] client.close() failed (ignored):', err);
        }
      }
    },
  };
} 