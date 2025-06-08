import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

interface TerminalRequest {
  command: string
  cwd?: string
}

interface TerminalResponse {
  output: string
  cwd: string
  isError: boolean
}

// 安全でないコマンドのブラックリスト
const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'sudo',
  'su',
  'passwd',
  'shutdown',
  'reboot',
  'halt',
  'init',
  'mkfs',
  'fdisk',
  'dd',
  'format',
  'del /f /s /q',
  'rmdir /s /q'
]

// 許可されたコマンドのホワイトリスト（基本的なもの）
const ALLOWED_COMMANDS = [
  'ls', 'dir', 'pwd', 'cd', 'cat', 'type', 'echo', 'mkdir', 'touch', 'cp', 'copy', 'mv', 'move',
  'grep', 'find', 'head', 'tail', 'wc', 'sort', 'uniq', 'cut', 'sed', 'awk',
  'ps', 'top', 'df', 'du', 'free', 'uptime', 'date', 'whoami', 'id',
  'git', 'npm', 'yarn', 'pnpm', 'node', 'python', 'python3', 'pip', 'pip3',
  'which', 'where', 'whereis', 'man', 'help', 'history', 'clear', 'cls','claude','codex'
]

function isCommandSafe(command: string): boolean {
  const trimmedCommand = command.trim().toLowerCase()
  
  // 危険なコマンドのチェック
  for (const dangerous of DANGEROUS_COMMANDS) {
    if (trimmedCommand.includes(dangerous.toLowerCase())) {
      return false
    }
  }
  
  // 基本的なコマンドの抽出
  const baseCommand = trimmedCommand.split(' ')[0] || ''
  
  // 許可されたコマンドのチェック
  return ALLOWED_COMMANDS.includes(baseCommand)
}

function sanitizePath(inputPath: string): string {
  // ホームディレクトリの展開
  let resolvedPath = inputPath
  if (inputPath === '~' || inputPath.startsWith('~/')) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/home'
    resolvedPath = inputPath.replace(/^~/, homeDir)
  }
  
  // パスインジェクション攻撃を防ぐ
  const normalized = path.normalize(resolvedPath)
  
  // 上位ディレクトリへの移動を制限
  if (normalized.includes('..')) {
    return process.cwd()
  }
  
  return normalized
}

export async function POST(request: NextRequest) {
  console.log('ターミナルAPI: POSTリクエスト受信')
  try {
    const body: TerminalRequest = await request.json()
    console.log('ターミナルAPI: リクエストボディ:', body)
    const { command, cwd = process.cwd() } = body

    if (!command || typeof command !== 'string') {
      console.log('ターミナルAPI: 無効なコマンド:', command)
      return NextResponse.json(
        { error: 'Command is required and must be a string' },
        { status: 400 }
      )
    }

    console.log('ターミナルAPI: コマンド実行開始:', command, 'in', cwd)

    // コマンドの安全性チェック
    if (!isCommandSafe(command)) {
      console.log('ターミナルAPI: 安全でないコマンド:', command)
      return NextResponse.json({
        output: `Command "${command}" is not allowed for security reasons.`,
        cwd: cwd,
        isError: true
      })
    }

    console.log('ターミナルAPI: コマンドセキュリティチェック通過')

    // 作業ディレクトリの安全性チェック
    const sanitizedCwd = sanitizePath(cwd)
    
    // 作業ディレクトリが存在するかチェック
    if (!fs.existsSync(sanitizedCwd)) {
      return NextResponse.json({
        output: `Directory "${sanitizedCwd}" does not exist.`,
        cwd: process.cwd(),
        isError: true
      })
    }

    return new Promise<NextResponse>((resolve) => {
      let output = ''
      let isError = false
      let newCwd = sanitizedCwd

      // プラットフォーム別のシェル設定
      const isWindows = process.platform === 'win32'
      const shell = isWindows ? 'cmd.exe' : '/bin/bash'
      const shellArgs = isWindows ? ['/c'] : ['-c']

      // cdコマンドの特別処理
      if (command.trim().startsWith('cd ')) {
        const targetPath = command.trim().substring(3).trim()
        let resolvedPath: string

        if (targetPath === '' || targetPath === '~') {
          resolvedPath = process.env.HOME || process.env.USERPROFILE || process.cwd()
        } else if (targetPath.startsWith('~/')) {
          const homeDir = process.env.HOME || process.env.USERPROFILE || '/home'
          resolvedPath = targetPath.replace(/^~/, homeDir)
        } else if (path.isAbsolute(targetPath)) {
          resolvedPath = targetPath
        } else {
          resolvedPath = path.resolve(sanitizedCwd, targetPath)
        }

        resolvedPath = sanitizePath(resolvedPath)

        console.log('ターミナルAPI: cd処理 ->', resolvedPath)

        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
          newCwd = resolvedPath
          output = ''
          console.log('ターミナルAPI: ディレクトリ変更成功:', newCwd)
        } else {
          output = `cd: no such file or directory: ${targetPath}`
          isError = true
          console.log('ターミナルAPI: ディレクトリ変更失敗:', targetPath)
        }

        resolve(NextResponse.json({
          output,
          cwd: newCwd,
          isError
        }))
        return
      }

      // その他のコマンドの実行
      const child = spawn(shell, [...shellArgs, command], {
        cwd: sanitizedCwd,
        stdio: 'pipe',
        timeout: 30000, // 30秒のタイムアウト
        env: {
          ...process.env,
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          USER: process.env.USER,
        }
      })

      child.stdout?.on('data', (data) => {
        const chunk = data.toString()
        console.log('ターミナルAPI: stdout受信:', chunk)
        output += chunk
      })

      child.stderr?.on('data', (data) => {
        const chunk = data.toString()
        console.log('ターミナルAPI: stderr受信:', chunk)
        output += chunk
        isError = true
      })

      child.on('close', (code) => {
        console.log('ターミナルAPI: プロセス終了, exit code:', code)
        console.log('ターミナルAPI: 最終出力:', output)
        if (code !== 0) {
          isError = true
        }
        
        const response = {
          output: output || '',
          cwd: newCwd,
          isError
        }
        console.log('ターミナルAPI: レスポンス送信:', response)
        resolve(NextResponse.json(response))
      })

      child.on('error', (error) => {
        resolve(NextResponse.json({
          output: `Error executing command: ${error.message}`,
          cwd: newCwd,
          isError: true
        }))
      })

      // タイムアウト処理
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGTERM')
          resolve(NextResponse.json({
            output: 'Command timed out (30 seconds)',
            cwd: newCwd,
            isError: true
          }))
        }
      }, 30000)
    })

  } catch (error) {
    console.error('Terminal API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        output: 'Failed to execute command',
        cwd: process.cwd(),
        isError: true
      },
      { status: 500 }
    )
  }
}