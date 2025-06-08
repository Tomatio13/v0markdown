const { WebSocketServer } = require('ws')
const pty = require('node-pty')
const fs = require('fs')

const wss = new WebSocketServer({ port: 3003 })

// ターミナルセッションを管理するMap
const terminalSessions = new Map()

console.log('WebSocketターミナルサーバーがポート3003で起動しました')

wss.on('connection', (ws) => {
  console.log('クライアントが接続しました')

  // セッションIDを生成
  const sessionId = Math.random().toString(36).substring(7)
  
  const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash')
  const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd()
    
  if (!fs.existsSync(shell)) {
    console.error(`シェルが見つかりません: ${shell}`)
    ws.send(JSON.stringify({ type: 'error', message: `シェルが見つかりません: ${shell}` }))
    return ws.close()
  }
    
  console.log(`PTYプロセス作成開始 (セッション: ${sessionId}, シェル: ${shell})`)
    
  let ptyProcess
  try {
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: homeDir,
      env: { ...process.env, PWD: homeDir }
    })
    console.log(`PTYプロセス作成成功 (セッション: ${sessionId}, PID: ${ptyProcess.pid})`)
  } catch (error) {
    console.error(`PTYプロセス作成エラー (セッション: ${sessionId}):`, error)
    ws.send(JSON.stringify({ type: 'error', message: `PTYプロセス作成エラー: ${error.message}` }))
    return ws.close()
  }

  terminalSessions.set(sessionId, { ptyProcess, ws })

  // PTYからの出力をクライアントに送信
  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }))
    }
  })

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`PTYプロセス終了 (セッション: ${sessionId}):`, { exitCode, signal })
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', code: exitCode, signal: signal }))
    }
    ws.close()
  })

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      switch (data.type) {
        case 'input':
          ptyProcess.write(data.data)
          break
        case 'resize':
          ptyProcess.resize(data.cols, data.rows)
          break
      }
    } catch (error) {
      console.error('メッセージ処理エラー:', error)
    }
  })

  ws.on('close', () => {
    console.log(`クライアント接続終了 (セッション: ${sessionId})`)
    ptyProcess.kill()
    terminalSessions.delete(sessionId)
  })

  ws.on('error', (error) => {
    console.error(`WebSocketエラー (セッション: ${sessionId}):`, error)
    ws.close()
  })

  // 接続完了をクライアントに通知
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'connected', sessionId: sessionId }))
  }
})

const shutdown = () => {
  console.log('\nサーバーを停止中...')
  for (const { ptyProcess } of terminalSessions.values()) {
    ptyProcess.kill()
  }
  wss.close(() => {
    console.log('WebSocketサーバーが停止しました')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown) 