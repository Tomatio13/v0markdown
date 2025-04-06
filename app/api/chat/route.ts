// Next.js AI Chatbot APIルート
//import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { streamText } from 'ai';

// Vercel AI SDK OpenAIプロバイダーを初期化
// const openai = createOpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   // compatibility: 'strict', // 必要に応じてコメント解除
// });

const xai = createXai({
    apiKey: process.env.GROK_API_KEY,
  });

// エッジランタイムを使用
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // streamTextを使用してストリーミングレスポンスを生成
    const result = await streamText({
      // openaiプロバイダーからチャットモデルを取得
      //model: openai('gpt-4o-mini'), 
      model: xai('grok-2-1212'),
      messages,
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