const { WebSocketServer } = require('ws')
const pty = require('node-pty')
const os = require('os')

const port = 3003
const hostname = 'localhost'

// ターミナルセッションを管理するMap
const terminalSessions = new Map()

console.log(`WebSocketサーバーを起動中... ws://${hostname}:${port}`)

// WebSocketサーバーを作成
const wss = new WebSocketServer({ 
  port: port,
  host: hostname
})

console.log(`✅ WebSocketサーバー起動完了: ws://${hostname}:${port}`)
console.log('ターミナル接続を待機中...')

wss.on('connection', (ws, request) => {
  console.log('WebSocket接続確立')
  
  // セッションIDを生成
  const sessionId = Math.random().toString(36).substring(7)
  
  // プラットフォーム別のシェル設定
  const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'
  const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd()
  
  // PTYプロセスを作成
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: homeDir,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    }
  })

  // セッション管理
  const session = {
    ptyProcess: ptyProcess,
    cols: 80,
    rows: 24
  }
  terminalSessions.set(sessionId, session)

  // PTYからの出力をWebSocketに転送
  ptyProcess.onData((data) => {
    try {
      ws.send(JSON.stringify({
        type: 'output',
        data: data
      }))
    } catch (error) {
      console.error('データ送信エラー:', error)
    }
  })

  // PTYプロセス終了時の処理
  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`PTYプロセス終了 (セッション: ${sessionId}):`, { exitCode, signal })
    try {
      ws.send(JSON.stringify({
        type: 'exit',
        code: exitCode,
        signal: signal
      }))
    } catch (error) {
      console.error('終了メッセージ送信エラー:', error)
    }
    terminalSessions.delete(sessionId)
  })

  // 初期メッセージを送信
  console.log(`セッション ${sessionId} に connected メッセージを送信`)
  ws.send(JSON.stringify({
    type: 'connected',
    sessionId: sessionId
  }))

  // WebSocketからのメッセージを処理
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString())
      console.log(`セッション ${sessionId} からメッセージ受信:`, data.type, data.data ? `(${data.data.length}文字)` : '')
      
      const session = terminalSessions.get(sessionId)
      if (!session) return

      switch (data.type) {
        case 'input':
          // キー入力をPTYに送信
          session.ptyProcess.write(data.data)
          break
          
        case 'resize':
          // ターミナルサイズ変更
          if (session.cols !== data.cols || session.rows !== data.rows) {
            console.log(`ターミナルサイズ変更: ${data.cols}x${data.rows}`)
            session.cols = data.cols
            session.rows = data.rows
            session.ptyProcess.resize(data.cols, data.rows)
          }
          break

        case 'ready':
          // クライアント準備完了 - 初期プロンプトは自動的にPTYから送信される
          console.log(`セッション ${sessionId} から ready メッセージを受信`)
          break
          
        case 'ping':
          // 接続確認
          ws.send(JSON.stringify({ type: 'pong' }))
          break
          
        default:
          console.log('未知のメッセージタイプ:', data.type)
      }
    } catch (error) {
      console.error('メッセージ処理エラー:', error)
    }
  })

  // WebSocket接続終了時の処理
  ws.on('close', () => {
    console.log('WebSocket接続終了')
    const session = terminalSessions.get(sessionId)
    if (session && session.ptyProcess) {
      session.ptyProcess.kill()
    }
    terminalSessions.delete(sessionId)
  })

  // WebSocketエラー処理
  ws.on('error', (error) => {
    console.error('WebSocketエラー:', error)
    const session = terminalSessions.get(sessionId)
    if (session && session.ptyProcess) {
      session.ptyProcess.kill()
    }
    terminalSessions.delete(sessionId)
  })
})

// サーバー終了時の処理
process.on('SIGINT', () => {
  console.log('\nWebSocketサーバーを停止中...')
  
  // 全てのPTYプロセスを終了
  for (const [sessionId, session] of terminalSessions) {
    if (session.ptyProcess) {
      session.ptyProcess.kill()
    }
  }
  
  wss.close(() => {
    console.log('WebSocketサーバーが停止しました')
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\nWebSocketサーバーを停止中...')
  
  // 全てのPTYプロセスを終了
  for (const [sessionId, session] of terminalSessions) {
    if (session.ptyProcess) {
      session.ptyProcess.kill()
    }
  }
  
  wss.close(() => {
    console.log('WebSocketサーバーが停止しました')
    process.exit(0)
  })
}) 