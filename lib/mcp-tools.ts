// 新規ファイル: MCP クライアントとツールを管理
import {
  experimental_createMCPClient as createMCPClient,
  type ToolSet,
} from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

// MCP_SERVERS_JSON の想定フォーマット (STDIO - StdioMCPTransport 用)
// {
//   "serverKey": {
//     "command": "node",                 // 必須: 実行ファイルパス (string)
//     "args": ["path/to/server.js"],  // オプション: コマンド引数 (string[])
//     "cwd": "/path/to/workdir"                // オプション: 作業ディレクトリ
//   },
//   ...
// }

/**
 * MCP_SERVERS_JSON をパースして、各サーバへ接続しツールをまとめる。
 * StdioMCPTransport を使用し、ツール名の重複を防ぐため `serverKey_toolName` 形式でリネームする。
 */
export async function getMcpTools(): Promise<{
  tools: ToolSet;
  closeAll: () => Promise<void>;
}> {
  const envVar = process.env.MCP_SERVERS_JSON;
  if (!envVar) {
    return { tools: {}, closeAll: async () => {} };
  }

  let config: Record<
    string,
    { command: string; args?: string[]; env?: Record<string, string> }
  >;
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
        if (typeof value.command !== 'string' || value.command.trim() === '') {
          console.error(
            `[MCP] Invalid command for ${key}: must be a non-empty string.`
          );
          return;
        }

        if (value.env && typeof value.env !== 'object') {
          console.error(
            `[MCP] Invalid env for ${key}: must be an object.`
          );
          return;
        }
        if (value.env && Object.values(value.env).some(v => typeof v !== 'string')) {
           console.error(
             `[MCP] Invalid env value for ${key}: all values must be strings.`
           );
           return;
        }

        // process.env から undefined の値を除外
        const filteredProcessEnv: Record<string, string> = {};
        for (const key in process.env) {
          if (Object.prototype.hasOwnProperty.call(process.env, key) && process.env[key] !== undefined) {
            filteredProcessEnv[key] = process.env[key]!;
          }
        }

        const client = await createMCPClient({
          // StdioMCPTransport インスタンスを直接渡す
          transport: new StdioMCPTransport({
            command: value.command,
            args: value.args,
            env: {
              ...filteredProcessEnv, // undefined を除外した環境変数
              ...(value.env ?? {}), // MCP_SERVERS_JSON で指定された環境変数で上書き/追加
            },
          }),
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
        const cmdString = `${value.command} ${value.args?.join(' ') ?? ''}`;
        console.error(`[MCP] Failed to init client ${key} with command '${cmdString.trim()}':`, err);
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
          console.warn('[MCP] client.close() failed (ignored):', err);
        }
      }
    },
  };
} 