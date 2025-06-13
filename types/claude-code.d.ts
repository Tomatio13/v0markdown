declare module '@anthropic-ai/claude-code' {
  export interface SDKMessage {
    type: 'assistant' | 'user' | 'result' | 'system';
    message?: any;
    session_id?: string;
    subtype?: 'init' | 'success' | 'error_max_turns' | 'error_during_execution';
    duration_ms?: number;
    duration_api_ms?: number;
    is_error?: boolean;
    num_turns?: number;
    result?: string;
    total_cost_usd?: number;
    apiKeySource?: string;
    cwd?: string;
    tools?: string[];
    mcp_servers?: Array<{
      name: string;
      status: string;
    }>;
    model?: string;
    permissionMode?: string;
  }

  export interface ClaudeCodeOptions {
    maxTurns?: number;
    systemPrompt?: string;
    cwd?: string;
    allowedTools?: string[];
    disallowedTools?: string[];
    permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  }

  export function query(options: {
    prompt: string;
    abortController?: AbortController;
    options?: ClaudeCodeOptions;
    cwd?: string;
    executable?: string;
    executableArgs?: string[];
    pathToClaudeCodeExecutable?: string;
  }): AsyncIterable<SDKMessage>;
} 