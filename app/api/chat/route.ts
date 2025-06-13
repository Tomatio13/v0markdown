// Next.js AI Chatbot APIルート
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { createXai, XaiProvider } from '@ai-sdk/xai';
import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { createAnthropic, AnthropicProvider } from '@ai-sdk/anthropic';
import { streamText, CoreMessage, LanguageModel, TextPart, FilePart, ImagePart, CoreUserMessage } from 'ai';
import { getMcpTools } from '@/lib/mcp-tools';
import { memoryTools } from '@/lib/local-tools';
import { createOllama, OllamaProvider } from 'ollama-ai-provider';
import { query, type SDKMessage } from "@anthropic-ai/claude-code";
import fs from 'fs';
import path from 'path';
import { convertFileToMarkdown } from '@/lib/server-utils';

// --- モデル設定の型定義 ---
interface ProviderModels {
  models: string[];
}
interface ModelConfig {
  openai?: ProviderModels;
  xai?: ProviderModels;
  gemini?: ProviderModels;
  anthropic?: ProviderModels;
  ollama?: ProviderModels;
  claudecode?: ProviderModels;
}

// ファイルアップロード用の拡張型
interface UploadedFilePart {
  type: 'file';
  data: string;  // Base64エンコードされたデータ
  mimeType: string;
  name?: string;
}

// テキストパート用の拡張型
interface TextMessagePart {
  type: 'text';
  text: string;
}

// ユーザーメッセージ用の拡張型
interface ExtendedUserMessage {
  role: 'user';
  content: string | Array<TextMessagePart | { type: 'file'; file: UploadedFilePart }>;
}

// 日本の現在時刻を表示する関数
const getJapanTime = (): string => {
  const now = new Date();
  // 日本標準時 (JST: UTC+9) に変換
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  return new Intl.DateTimeFormat('ja-JP', options).format(now);
}

// カスタムプロンプトファイルを読み込む関数
const loadCustomPrompt = (): string => {
  try {
    // 環境変数からカスタムプロンプトのファイル名を取得
    const customPromptFile = process.env.CUSTOM_PROMPT;
    
    // カスタムプロンプトが設定されていない場合は空文字列を返す
    if (!customPromptFile) {
      return '';
    }
    
    // プロンプトファイルのパスを生成
    const promptPath = path.join(process.cwd(), 'public', 'prompt', customPromptFile);
    
    // ファイルが存在するか確認
    if (!fs.existsSync(promptPath)) {
      console.warn(`カスタムプロンプトファイルが見つかりません: ${promptPath}`);
      return '';
    }
    
    // ファイルを読み込んで内容を返す
    const promptContent = fs.readFileSync(promptPath, 'utf-8');
    
    return promptContent;
  } catch (error) {
    console.error('カスタムプロンプトの読み込みに失敗しました:', error);
    return '';
  }
};

// --- 環境変数とプロバイダー初期化 ---
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiBaseURL = process.env.OPENAI_BASE_URL; // OpenAI互換サービス用のベースURL
const grokApiKey = process.env.GROK_API_KEY;
const googleApiKey = process.env.GEMINI_API_KEY; // Gemini用の環境変数キー
const anthropicApiKey = process.env.ANTHROPIC_API_KEY; // Anthropic用
const ollamaBaseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api'; // Ollama用のベースURL

// Claude Code用の特別な型
interface ClaudeCodeProvider {
  type: 'claudecode';
  available: boolean;
}

// プロバイダーの型を定義
type AIProvider = OpenAIProvider | XaiProvider | GoogleGenerativeAIProvider | AnthropicProvider | OllamaProvider | ClaudeCodeProvider;

// OpenAIプロバイダーの初期化 - baseURLがあれば設定
const openai: OpenAIProvider | null = openaiApiKey 
  ? (openaiBaseURL 
    ? createOpenAI({ apiKey: openaiApiKey, baseURL: openaiBaseURL })
    : createOpenAI({ apiKey: openaiApiKey }))
  : null;
const xai: XaiProvider | null = grokApiKey ? createXai({ apiKey: grokApiKey }) : null;
const google: GoogleGenerativeAIProvider | null = googleApiKey ? createGoogleGenerativeAI({ apiKey: googleApiKey }) : null;
const anthropic: AnthropicProvider | null = anthropicApiKey ? createAnthropic({ apiKey: anthropicApiKey }) : null;
const ollama: OllamaProvider | null = createOllama({ baseURL: ollamaBaseURL });

// Claude Code プロバイダーの初期化
let claudeCode: ClaudeCodeProvider | null = null;
try {
  if (anthropicApiKey) {
    // Claude Code SDKが利用可能かチェック
    require('@anthropic-ai/claude-code');
    claudeCode = { type: 'claudecode', available: true };
    console.log('[Claude Code] ANTHROPIC_API_KEY が設定され、SDK が正常に読み込まれました');
  } else {
    console.log('[Claude Code] ANTHROPIC_API_KEY が設定されていません');
  }
} catch (error) {
  console.error('[Claude Code] 初期化エラー:', error);
  claudeCode = null;
}

// MODELS環境変数をパース
const parseModelConfig = (): ModelConfig => {
  const modelsEnv = process.env.MODELS;
  if (!modelsEnv) {
    console.warn('MODELS環境変数が設定されていません。');
    return {};
  }
  try {
    const cleanedJsonString = modelsEnv.replace(/"models":"(.*?)"/g, (match, p1) => {
        const modelsArray = p1.split(',').map((m: string) => m.trim()).filter((m: string) => m);
        return `"models":${JSON.stringify(modelsArray)}`;
    });
    return JSON.parse(cleanedJsonString) as ModelConfig;
  } catch (error) {
    console.error('MODELS環境変数のJSONパースに失敗しました:', error);
    return {};
  }
};

const modelConfig = parseModelConfig();

// 利用可能なモデルリストを動的に生成
const getAvailableModels = (): { id: string; name: string }[] => {
  const availableModels: { id: string; name: string }[] = [];

  // OpenAI
  if (openai && modelConfig.openai?.models) {
    modelConfig.openai.models.forEach(modelId => {
      availableModels.push({ id: modelId, name: `OpenAI ${modelId}` });
    });
  }
  // xAI
  if (xai && modelConfig.xai?.models) {
    modelConfig.xai.models.forEach(modelId => {
      availableModels.push({ id: modelId, name: `xAI ${modelId}` });
    });
  }
  // Gemini
  if (google && modelConfig.gemini?.models) {
    modelConfig.gemini.models.forEach(modelId => {
      availableModels.push({ id: modelId, name: `Google ${modelId}` });
    });
  }
  // Anthropic
  if (anthropic && modelConfig.anthropic?.models) {
    modelConfig.anthropic.models.forEach(modelId => {
      availableModels.push({ id: modelId, name: `Anthropic ${modelId}` });
    });
  }
  // Ollama
  if (modelConfig.ollama?.models) {
    modelConfig.ollama.models.forEach(modelId => {
      availableModels.push({ id: modelId, name: `Ollama ${modelId}` });
    });
  }
  // Claude Code
  if (claudeCode && modelConfig.claudecode?.models) {
    modelConfig.claudecode.models.forEach(modelId => {
      availableModels.push({ id: modelId, name: `Claude Code ${modelId}` });
    });
  }

  if (availableModels.length === 0) {
    console.warn("警告: 利用可能なAIモデルが見つかりませんでした。MODELS環境変数とAPIキーを確認してください。");
  }
  return availableModels;
};

// モデルIDからプロバイダーインスタンスとモデルIDを返すヘルパー関数
const getProviderAndModelId = (modelId: string): { provider: AIProvider; modelId: string; modelSettings?: any; isClaudeCode?: boolean } | null => {
  if (modelConfig.openai?.models.includes(modelId)) {
    if (!openai) throw new Error(`OpenAI APIキーが設定されていませんが、モデル ${modelId} が要求されました。`);
    return { provider: openai, modelId: modelId };
  }
  if (modelConfig.xai?.models.includes(modelId)) {
    if (!xai) throw new Error(`Grok APIキーが設定されていませんが、モデル ${modelId} が要求されました。`);
    return { provider: xai, modelId: modelId };
  }
  if (modelConfig.gemini?.models.includes(modelId)) {
    if (!google) throw new Error(`Google APIキーが設定されていませんが、モデル ${modelId} が要求されました。`);
    return { provider: google, modelId: modelId };
  }
  if (modelConfig.anthropic?.models.includes(modelId)) {
    if (!anthropic) throw new Error(`Anthropic APIキーが設定されていませんが、モデル ${modelId} が要求されました。`);
    return { provider: anthropic, modelId: modelId };
  }
  if (modelConfig.ollama?.models.includes(modelId)) {
    return {
      provider: ollama,
      modelId: modelId,
      // Ollama はネイティブストリーミングをサポートするため simulateStreaming は設定しない
    };
  }
  if (modelConfig.claudecode?.models.includes(modelId)) {
    if (!claudeCode) throw new Error(`Anthropic APIキーが設定されていませんが、Claude Code モデル ${modelId} が要求されました。`);
    return { provider: claudeCode, modelId: modelId, isClaudeCode: true };
  }
  console.warn(`設定に存在しない、またはAPIキーが設定されていないモデルIDが指定されました: ${modelId}`);
  return null; // 見つからない場合はnullを返す
};

// Node.js ランタイムを使用
// export const runtime = 'edge';

// GETリクエストハンドラ（利用可能モデルリスト取得用）
export async function GET(req: Request) {
  try {
    const availableModels = getAvailableModels();
    return new Response(JSON.stringify(availableModels), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[AVAILABLE MODELS API ERROR]', error);
    return new Response(JSON.stringify({ error: '利用可能なモデルの取得に失敗しました' }), {
      status: 500,
    });
  }
}

// メッセージを処理してファイルパーツを抽出する関数
const processMessages = (messages: (CoreMessage | ExtendedUserMessage)[]): CoreMessage[] | Promise<CoreMessage[]> => {
  // 最後のメッセージ以外からはファイルデータを削除
  const process = async () => {
    return Promise.all(messages.map(async (message, index) => {
      const isLastMessage = index === messages.length - 1;
      
      // ユーザーメッセージでかつcontent内にファイルパーツが含まれている場合
      if (message.role === 'user' && typeof message.content !== 'string' && Array.isArray(message.content)) {
        // 最後のメッセージでない場合はファイルデータを削除
        if (!isLastMessage) {
          // テキスト部分だけを抽出
          const textContent = message.content
            .filter(part => part.type === 'text')
            .map(part => part.type === 'text' ? part.text : '')
            .join(' ');
          
          // ファイルデータなしのテキストメッセージとして返す
          return {
            role: 'user',
            content: textContent || '【ファイルアップロード】'
          } as CoreMessage;
        }
        
        // 最後のメッセージは通常処理
        const userContent: Array<TextPart | FilePart | ImagePart> = [];

        // メッセージの内容をAI SDKの形式に合わせて変換
        for (const part of message.content) {
          if (part.type === 'text') {
            userContent.push({
              type: 'text',
              text: part.text
            });
          } else if (part.type === 'file' && 'file' in part && part.file) {
            const { data, mimeType, name } = part.file;
            // PDF
            if (mimeType === 'application/pdf') {
              const hasDataUrlPrefix = data.startsWith('data:');
              const dataUrl = hasDataUrlPrefix ? data : `data:${mimeType};base64,${data}`;
              userContent.push({
                type: 'file',
                data: dataUrl,
                mimeType: mimeType
              });
            }
            // 画像
            else if (mimeType.startsWith('image/')) {
              const hasDataUrlPrefix = data.startsWith('data:');
              const dataUrl = hasDataUrlPrefix ? data : `data:${mimeType};base64,${data}`;
              userContent.push({
                type: 'image',
                image: dataUrl,
                mimeType: mimeType
              });
            }
            // その他（markitdownでMarkdown化）
            else {
              try {
                const text = await convertFileToMarkdown(data, mimeType, name);
                userContent.push({
                  type: 'text',
                  text: text
                });
              } catch (err) {
                userContent.push({
                  type: 'text',
                  text: `【ファイル変換エラー】このファイルはMarkdown化できませんでした: ${(err as Error).message}`
                });
              }
            }
          }
        }
        // 標準のCoreUserMessageの形式に変換
        return {
          role: 'user',
          content: userContent
        } as CoreUserMessage;
      }
      return message as CoreMessage;
    }));
  };
  // Promiseを返すことでPOST側でawaitできるようにする
  return process();
};

// POSTリクエストハンドラ (チャット処理)
export async function POST(req: Request) {
  try {
    // リクエストボディから messages と model を取得
    const { messages, model: requestedModelId } = await req.json();

    // MCP ツールを読み込み
    const { tools: mcpTools, closeAll } = await getMcpTools();
    const tools = { ...memoryTools, ...mcpTools };

    // 利用可能なモデルリストを取得（フォールバック用）
    const availableModels = getAvailableModels();
    if (availableModels.length === 0) {
      throw new Error("利用可能なAIモデルが設定されていません。");
    }

    // リクエストされたモデルID、または利用可能な最初のモデルIDを使用
    const modelIdToUse = requestedModelId && availableModels.some(m => m.id === requestedModelId)
      ? requestedModelId
      : availableModels[0].id; // フォールバックとして最初の利用可能モデル

    // ヘルパー関数を使ってプロバイダーとモデルIDを取得 (letに変更)
    let providerInfo = getProviderAndModelId(modelIdToUse);

    // フォールバック処理
    if (!providerInfo) {
        console.warn(`指定されたモデル ${modelIdToUse} が見つからないため、フォールバックします。`);
        const fallbackModelId = availableModels[0].id;
        const fallbackProviderInfo = getProviderAndModelId(fallbackModelId);
        if (!fallbackProviderInfo) {
            throw new Error("致命的エラー: 利用可能なモデルが見つかりません。");
        }
        providerInfo = fallbackProviderInfo; // letなので再代入可能
    }

    // Claude Code の場合は特別な処理
    if (providerInfo.isClaudeCode) {
      console.log('[Claude Code] 処理開始');
      
      // APIキーの確認
      if (!anthropicApiKey) {
        console.error('[Claude Code] ANTHROPIC_API_KEY が設定されていません');
        throw new Error('Claude Code を使用するには ANTHROPIC_API_KEY の設定が必要です。');
      }
      
      // メッセージを処理してテキストのみ抽出
      const processedMessages = await processMessages(messages);
      
      // 最後のユーザーメッセージからプロンプトを抽出
      const lastUserMessage = processedMessages.filter(m => m.role === 'user').pop();
      let prompt = '';
      
      if (lastUserMessage) {
        if (typeof lastUserMessage.content === 'string') {
          prompt = lastUserMessage.content;
        } else if (Array.isArray(lastUserMessage.content)) {
          prompt = lastUserMessage.content
            .filter(part => part.type === 'text')
            .map(part => (part as TextPart).text)
            .join(' ');
        }
      }

      console.log('[Claude Code] プロンプト:', prompt.substring(0, 100) + '...');

      // Claude Codeの結果を収集
      let claudeCodeResponse = '';
      let hasError = false;
      let errorMessage = '';

      try {
        console.log('[Claude Code] クエリ実行開始');
        
        // タイムアウト設定
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('[Claude Code] サーバー側タイムアウト発生 (480秒)');
          abortController.abort();
        }, 480000);

        let messageCount = 0;
        
        try {
          for await (const message of query({
            prompt: prompt,
            abortController: abortController,
            options: {
              maxTurns: 30,
              systemPrompt: "You are a helpful AI assistant for general conversation and questions. You should NOT access, read, or reference any local files or code. Do not use any file system tools. Focus on providing helpful responses based on your training knowledge and web information when needed. If you need current information, you may use WebFetch to search the internet, but avoid accessing local files or code repositories.",
              cwd: process.cwd(),
              permissionMode: "bypassPermissions",
              allowedTools: ["WebFetch"],
              disallowedTools: ["Write", "Read", "Execute", "Edit", "Create", "Delete", "Run", "File", "Directory", "Git"],
            },
          })) {
            messageCount++;
            console.log(`[Claude Code] メッセージ ${messageCount} 受信:`, message.type);
            
            // 初期化メッセージをスキップ
            if (message.type === 'system' && message.subtype === 'init') {
              console.log('[Claude Code] 初期化メッセージをスキップ');
              continue;
            }
            
            if (message.type === 'assistant' && message.message?.content) {
              let responseText = '';
              
              if (Array.isArray(message.message.content)) {
                responseText = message.message.content
                  .filter((part: any) => part.type === 'text')
                  .map((part: any) => part.text)
                  .join('');
              } else if (typeof message.message.content === 'string') {
                responseText = message.message.content;
              }
              
              if (responseText && !claudeCodeResponse.includes(responseText)) {
                claudeCodeResponse += responseText;
                console.log('[Claude Code] レスポンス受信:', responseText.substring(0, 100) + '...');
              }
            } else if (message.type === 'result') {
              console.log('[Claude Code] 結果メッセージ受信');
              
              if (message.subtype === 'success' && message.result) {
                const resultText = typeof message.result === 'string' ? message.result : JSON.stringify(message.result);
                if (resultText && !claudeCodeResponse.includes(resultText)) {
                  claudeCodeResponse += resultText;
                  console.log('[Claude Code] 結果受信:', resultText.substring(0, 100) + '...');
                }
              }
              
              break;
            }
            
            if (messageCount > 50) {
              console.log('[Claude Code] メッセージ数上限に達しました');
              break;
            }
          }
        } catch (iteratorError) {
          console.error('[Claude Code] イテレーターエラー:', iteratorError);
          hasError = true;
          if (iteratorError instanceof Error) {
            if (iteratorError.message.includes('exited with code 143')) {
              errorMessage = 'Claude Codeの処理が中断されました。より簡潔な質問で再度お試しください。';
            } else if (iteratorError.message.includes('exited with code')) {
              errorMessage = 'Claude Codeプロセスが異常終了しました。APIキーを確認してください。';
            } else {
              errorMessage = `Claude Code エラー: ${iteratorError.message}`;
            }
          } else {
            errorMessage = 'Claude Codeの処理中にエラーが発生しました。';
          }
        }

        clearTimeout(timeoutId);
        
        if (!hasError && (!claudeCodeResponse || claudeCodeResponse.trim() === '')) {
          hasError = true;
          errorMessage = 'Claude Codeからの応答を取得できませんでした。より簡潔な質問で再度お試しください。';
        }
        
        console.log('[Claude Code] 処理完了');

      } catch (error) {
        console.error('[Claude Code] エラー:', error);
        hasError = true;
        
        if (error instanceof Error) {
          if (error.message.includes('abort')) {
            errorMessage = 'Claude Codeの処理がタイムアウトしました。より簡潔な質問で再度お試しください。';
          } else if (error.message.includes('exited with code 1')) {
            errorMessage = 'Claude Codeの初期化に失敗しました。APIキーを確認してください。';
          } else {
            errorMessage = `Claude Code エラー: ${error.message}`;
          }
        } else {
          errorMessage = 'Claude Codeでエラーが発生しました。';
        }
      }

      // 結果をAI SDKのstreamTextで処理
      const finalResponse = hasError ? errorMessage : claudeCodeResponse;
      
      // 仮想的なAnthropicプロバイダーを使用してストリーミング
      if (!anthropic) {
        throw new Error('Anthropic プロバイダーが利用できません。');
      }
      
      const result = await streamText({
        model: anthropic('claude-3-haiku-20240307'),
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Simply return the provided response exactly as given, without any modifications or additions.'
          },
          {
            role: 'user',
            content: `Please return this response exactly: ${finalResponse}`
          }
        ],
        onFinish: async () => {
          await closeAll();
        },
      });
      
      return result.toDataStreamResponse();
    }

    // 通常のプロバイダーの処理
    // メッセージを処理してファイルパーツがあれば変換
    const processedMessages = await processMessages(messages);

    // streamText に渡す LanguageModel インスタンスを生成
    const modelInstance: LanguageModel = providerInfo.modelSettings 
      ? (providerInfo.provider as any)(providerInfo.modelId as any, providerInfo.modelSettings)
      : (providerInfo.provider as any)(providerInfo.modelId as any);

    // Ollama で画像や PDF が添付されている場合はツール呼び出しを省く
    const hasFileAttachment = processedMessages.some(m =>
      m.role === 'user' && Array.isArray(m.content) && m.content.some((p: any) => {
        if (p.type === 'image') return true;
        if (p.type === 'file') return p.mimeType === 'application/pdf';
        return false;
      })
    );

    const shouldIncludeTools = !(providerInfo.provider === ollama && hasFileAttachment);

    const result = await streamText({
      model: modelInstance,
      messages: processedMessages,
      ...(shouldIncludeTools ? { tools } : {}),
      maxSteps: 10,
      system: `You are a helpful japanese assistant that can answer questions and help with tasks.speak in japanese.
              Today's date and time in Japan is ${getJapanTime()}.
              Format your responses using Markdown, especially utilizing these elements:
              - Headings (#, ##)
              - Bullet points (- or 1.)
              - Code blocks (\`\`\`)
              - Bold (**bold**) and italic (*italic*)
              - Links ([link](https://example.com))

              When the Quatro format is specified, please use the following format:
              - Code blocks for outputting graphs should be in the {python} format.
              - Titles and other string elements within the graphs should be in English.
                However, the main body of the text should be in Japanese.

              When using Weather MCP, please specify the city name in English and take the current date and time into consideration..
              
              ${loadCustomPrompt()}
              `,
      onFinish: async () => {
        await closeAll();
      },
    });
    // 成功時は streamText の結果をそのまま返す
    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error('[CHAT API ERROR]', error);
    const errorMessage = error.message || 'AIとの対話に失敗しました';
    // エラー時はプレーンテキストのストリームを返す
    const errorStream = new ReadableStream({
        start(controller) {
            controller.enqueue(`エラーが発生しました: ${errorMessage}`); // エラーメッセージをエンコード
            controller.close();
        }
    });
    // 標準のResponseオブジェクトを使用し、Content-Typeを指定
    return new Response(errorStream, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}