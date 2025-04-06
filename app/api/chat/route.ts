import OpenAI from 'openai';

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // リクエストからメッセージを取得
    const { messages } = await req.json();

    // OpenAI APIにリクエストを送信
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
    });

    // レスポンスを返す
    return Response.json({ 
      content: response.choices[0].message.content 
    });
  } catch (error) {
    console.error('ChatGPT APIエラー:', error);
    return Response.json({ 
      error: 'AIとの対話に失敗しました' 
    }, { 
      status: 500 
    });
  }
} 