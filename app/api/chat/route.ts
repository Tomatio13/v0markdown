// Next.js AI Chatbot APIルート
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import { createXai, XaiProvider } from '@ai-sdk/xai';
import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { createAnthropic, AnthropicProvider } from '@ai-sdk/anthropic';
import { streamText, CoreMessage, LanguageModel } from 'ai';
import { getMcpTools } from '@/lib/mcp-tools';
import { memoryTools } from '@/lib/local-tools';
import { createOllama, OllamaProvider } from 'ollama-ai-provider';
import fs from 'fs';
import path from 'path';

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
}

// --- 環境変数とプロバイダー初期化 ---
const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiBaseURL = process.env.OPENAI_BASE_URL; // OpenAI互換サービス用のベースURL
const grokApiKey = process.env.GROK_API_KEY;
const googleApiKey = process.env.GEMINI_API_KEY; // Gemini用の環境変数キー
const anthropicApiKey = process.env.ANTHROPIC_API_KEY; // Anthropic用
const ollamaBaseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api'; // Ollama用のベースURL

// プロバイダーの型を定義
type AIProvider = OpenAIProvider | XaiProvider | GoogleGenerativeAIProvider | AnthropicProvider | OllamaProvider;

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

  if (availableModels.length === 0) {
    console.warn("警告: 利用可能なAIモデルが見つかりませんでした。MODELS環境変数とAPIキーを確認してください。");
  }
  return availableModels;
};

// モデルIDからプロバイダーインスタンスとモデルIDを返すヘルパー関数
const getProviderAndModelId = (modelId: string): { provider: AIProvider; modelId: string; modelSettings?: any } | null => {
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
      modelSettings: { simulateStreaming: true } // ツールとストリーミングを正常に動作させるために必要
    };
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

// POSTリクエストハンドラ (チャット処理)
export async function POST(req: Request) {
  try {
    // リクエストボディから messages と model を取得 (model は string 型)
    const { messages, model: requestedModelId }: { messages: CoreMessage[]; model?: string } = await req.json();

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

    console.log(`使用するモデル: ${modelIdToUse}`); // デバッグログ

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

    // streamText に渡す LanguageModel インスタンスを生成
    const modelInstance: LanguageModel = providerInfo.modelSettings 
      ? providerInfo.provider(providerInfo.modelId as any, providerInfo.modelSettings)
      : providerInfo.provider(providerInfo.modelId as any);

    // streamTextを使用してストリーミングレスポンスを生成
    const result = await streamText({
      model: modelInstance, // 生成したLanguageModelインスタンスを使用
      messages,
      tools,
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
    console.log(`カスタムプロンプトを読み込みました: ${customPromptFile}`);
    
    return promptContent;
  } catch (error) {
    console.error('カスタムプロンプトの読み込みに失敗しました:', error);
    return '';
  }
}; 