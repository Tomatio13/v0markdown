import { NextRequest } from 'next/server'

// WebSocket接続情報を返すAPI（カスタムサーバーを使用）

// Next.js API Route（WebSocket接続情報を返す）
export async function GET(request: NextRequest) {
  try {
    // 独立したWebSocketサーバーの接続情報を返す
    const hostname = request.headers.get('host')?.split(':')[0] || 'localhost'
    const wsUrl = `ws://${hostname}:3003`
    
    return Response.json({
      websocketUrl: wsUrl,
      status: 'WebSocket server ready (independent server)',
      message: 'WebSocket connections are handled by independent server on port 3003',
      port: 3003
    })
  } catch (error) {
    console.error('WebSocket API エラー:', error)
    return Response.json(
      { error: 'Failed to get WebSocket connection info' },
      { status: 500 }
    )
  }
}

// WebSocket接続は独立したサーバーで処理
export async function POST(request: NextRequest) {
  return Response.json(
    { error: 'WebSocket connections should be established directly to the independent WebSocket server on port 3003' },
    { status: 405 }
  )
}