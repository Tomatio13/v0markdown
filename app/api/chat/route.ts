// Next.js AI Chatbot APIルート
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { streamText } from 'ai';
import { getMcpTools } from '@/lib/mcp-tools';
import { memoryTools } from '@/lib/local-tools';

// Vercel AI SDK OpenAIプロバイダーを初期化
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // compatibility: 'strict', // 必要に応じてコメント解除
});

const xai = createXai({
    apiKey: process.env.GROK_API_KEY,
  });

// エッジランタイムを使用
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // MCP ツールを読み込み
    const { tools: mcpTools } = await getMcpTools();
    const tools = { ...memoryTools, ...mcpTools };

    // streamTextを使用してストリーミングレスポンスを生成
    const result = await streamText({
      // openaiプロバイダーからチャットモデルを取得
      model: openai('gpt-4o-mini'), 
      // model: xai('grok-3-beta'),
      messages,
      tools,
      maxSteps: 10,
      system: `You are a helpful japanese assistant that can answer questions and help with tasks.speak in japanese.

                Format your responses using Markdown, especially utilizing these elements:
                - Headings (#, ##)
                - Bullet points (- or 1.)
                - Code blocks (\`\`\`)
                - Bold (**bold**) and italic (*italic*)

              Today's date is ${new Date().toISOString().split("T")[0]}.`,
      // Edge ランタイムでは fetch/SSE が自動的にクリーンアップされるため明示的な close は行わない
    });

    // ストリーミングレスポンスを返す (toDataStreamResponseを使用)
    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('[CHAT API ERROR]', error);
    return new Response(
      JSON.stringify({ error: error.message || 'AIとの対話に失敗しました' }),
      { status: 500 }
    );
  }
} 