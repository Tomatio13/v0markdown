import { NextRequest } from 'next/server'

// WebSocket接続情報を返すAPI（カスタムサーバーを使用）

// Next.js API Route（WebSocket接続情報を返す）
export async function GET(request: NextRequest) {
  try {
    // 環境変数からポート番号を取得（デフォルト: 3002）
    const port = process.env.WEBSOCK_LISTEN_PORT || 3002
    
    // 独立したWebSocketサーバーの接続情報を返す
    const hostname = request.headers.get('host')?.split(':')[0] || 'localhost'
    const wsUrl = `ws://${hostname}:${port}`
    
    return Response.json({
      websocketUrl: wsUrl,
      status: 'WebSocket server ready (independent server)',
      message: `WebSocket connections are handled by independent server on port ${port}`,
      port: parseInt(port.toString())
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
  const port = process.env.WEBSOCK_LISTEN_PORT || 3002
  return Response.json(
    { error: `WebSocket connections should be established directly to the independent WebSocket server on port ${port}` },
    { status: 405 }
  )
}