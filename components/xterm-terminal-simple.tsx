"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Terminal as TerminalIcon, X, Trash2, Settings } from 'lucide-react'

interface XTerminalProps {
  isDarkMode?: boolean
  onClose?: () => void
}

// 動的インポート用のhook
const useXTerm = () => {
  const [xterm, setXterm] = useState<any>(null)

  useEffect(() => {
    const loadXTerm = async () => {
      try {
        const [
          { Terminal },
          { FitAddon },
          { WebLinksAddon }
        ] = await Promise.all([
          import('xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links')
        ])
        
        setXterm({ Terminal, FitAddon, WebLinksAddon })
      } catch (error) {
        console.error('Failed to load xterm.js:', error)
      }
    }

    loadXTerm()
  }, [])

  return xterm
}

export const XTermTerminal: React.FC<XTerminalProps> = ({ isDarkMode = false, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentDirectory, setCurrentDirectory] = useState('~')
  const [isCommandRunning, setIsCommandRunning] = useState(false)
  
  const xterm = useXTerm()

  // 現在の入力を追跡するref
  const currentInputRef = useRef('')
  // ホームディレクトリを保持
  const homeDirectoryRef = useRef('')
  // 現在のディレクトリを即座に反映するため
  const currentDirectoryRef = useRef(currentDirectory)

  // プロンプト生成関数
  const generatePrompt = useCallback((directory: string) => {
    const user = 'user'
    const hostname = 'localhost'
    const homeDir = homeDirectoryRef.current
    const dir = homeDir && directory.startsWith(homeDir) 
      ? directory.replace(homeDir, '~')
      : directory.replace(/^\/home\/[^\/]+/, '~')
    return `\x1b[32m${user}@${hostname}\x1b[0m:\x1b[34m${dir}\x1b[0m$ `
  }, [])

  // コマンド実行
  const executeCommand = useCallback(async (command: string) => {
    if (!xtermRef.current || !command.trim() || isCommandRunning) {
      return
    }

    setIsCommandRunning(true)
    
    try {
      // コマンド履歴に追加
      setCommandHistory(prev => [...prev.filter(cmd => cmd !== command), command])
      setHistoryIndex(-1)

      // コマンドを実行 - 最新のディレクトリを使用
      const workingDirectory = currentDirectoryRef.current
      const requestBody = { command, cwd: workingDirectory }

      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        xtermRef.current?.writeln(`\x1b[31mError: ${result.error || 'Command execution failed'}\x1b[0m`)
      } else {
        // 現在のディレクトリを更新（常に最新のcwdを使用）
        if (result.cwd) {
          setCurrentDirectory(result.cwd)
          currentDirectoryRef.current = result.cwd // 即座に更新
        }

        // 出力を表示
        if (result.output) {
          if (result.isError) {
            // エラーの場合は赤色で表示 - 改行コードも変換
            const formattedError = result.output.replace(/\n/g, '\r\n')
            xtermRef.current?.write(`\x1b[31m${formattedError}\x1b[0m`)
          } else {
            // 通常の出力 - 改行コードを適切に変換
            if (result.output) {
              // Unix改行(\n)をターミナル改行(\r\n)に変換
              const formattedOutput = result.output.replace(/\n/g, '\r\n')
              xtermRef.current?.write(formattedOutput)
            }
          }
        }
      }

      // 新しいプロンプトを表示（出力処理後に実行）
      setTimeout(() => {
        // 出力の最後が改行で終わっていない場合は改行を追加
        if (result.output && !result.output.endsWith('\n')) {
          xtermRef.current?.write('\r\n')
        }
        // プロンプト生成時は最新のディレクトリ（result.cwd）を使用
        const latestDirectory = result.cwd || currentDirectory
        const prompt = generatePrompt(latestDirectory)
        xtermRef.current?.write(prompt)
      }, 50)
      

    } catch (error) {
      console.error('コマンド実行エラー:', error)
      xtermRef.current?.writeln(`\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`)
      
      // プロンプトを表示
      const prompt = generatePrompt(currentDirectory)
      xtermRef.current?.write(prompt)
    } finally {
      setIsCommandRunning(false)
    }
  }, [currentDirectory, generatePrompt])

  // 初期ディレクトリを取得
  useEffect(() => {
    const initializeDirectory = async () => {
      try {
        const response = await fetch('/api/terminal/init')
        const result = await response.json()
        if (result.homeDirectory) {
          homeDirectoryRef.current = result.homeDirectory
          setCurrentDirectory(result.homeDirectory)
          currentDirectoryRef.current = result.homeDirectory
        }
      } catch (error) {
        console.error('Failed to initialize directory:', error)
      }
    }
    
    initializeDirectory()
  }, [])

  // ターミナル初期化
  useEffect(() => {
    if (!xterm || !terminalRef.current || xtermRef.current) return

    const { Terminal, FitAddon, WebLinksAddon } = xterm

    // ターミナルテーマ設定
    const terminal = new Terminal({
      theme: isDarkMode ? {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#ffffff33',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#ffffff',
        brightBlack: '#44475a',
        brightRed: '#ff5555',
        brightGreen: '#50fa7b',
        brightYellow: '#f1fa8c',
        brightBlue: '#bd93f9',
        brightMagenta: '#ff79c6',
        brightCyan: '#8be9fd',
        brightWhite: '#ffffff'
      } : {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        selection: '#0000ff33'
      },
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 1000,
      tabStopWidth: 4
    })

    // アドオンを追加
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    // DOMに追加
    terminal.open(terminalRef.current)
    fitAddon.fit()
    

    // 参照を保存
    xtermRef.current = terminal
    fitAddonRef.current = fitAddon


    // 初期メッセージとプロンプト
    terminal.writeln('\x1b[36mWelcome to xterm.js Terminal!\x1b[0m')
    terminal.writeln('Type commands and press Enter to execute.')
    const prompt = generatePrompt(currentDirectory)
    terminal.write(prompt)

    // データ入力処理
    const disposables = [
      terminal.onData((data: string) => {
        if (isCommandRunning) return

        if (data === '\r') {
          // Enterキー: コマンド実行
          terminal.write('\r\n')
          if (currentInputRef.current.trim()) {
            executeCommand(currentInputRef.current)
            currentInputRef.current = ''
          } else {
            const prompt = generatePrompt(currentDirectory)
            terminal.write(prompt)
          }
        } else if (data === '\u007f') {
          // Backspace
          if (currentInputRef.current.length > 0) {
            currentInputRef.current = currentInputRef.current.slice(0, -1)
            terminal.write('\b \b')
          }
        } else if (data === '\u001b[A') {
          // 上矢印: 履歴の前
          if (commandHistory.length > 0) {
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
            if (newIndex !== historyIndex) {
              setHistoryIndex(newIndex)
              const cmd = commandHistory[commandHistory.length - 1 - newIndex]
              // 現在の行をクリア
              terminal.write('\r' + ' '.repeat(terminal.cols) + '\r')
              const prompt = generatePrompt(currentDirectory)
              terminal.write(prompt + cmd)
              currentInputRef.current = cmd
            }
          }
        } else if (data === '\u001b[B') {
          // 下矢印: 履歴の次
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1
            setHistoryIndex(newIndex)
            const cmd = commandHistory[commandHistory.length - 1 - newIndex]
            // 現在の行をクリア
            terminal.write('\r' + ' '.repeat(terminal.cols) + '\r')
            const prompt = generatePrompt(currentDirectory)
            terminal.write(prompt + cmd)
            currentInputRef.current = cmd
          } else if (historyIndex === 0) {
            setHistoryIndex(-1)
            terminal.write('\r' + ' '.repeat(terminal.cols) + '\r')
            const prompt = generatePrompt(currentDirectory)
            terminal.write(prompt)
            currentInputRef.current = ''
          }
        } else if (data === '\u0009') {
          // Tab: 簡単な補完
          const basicCommands = ['ls', 'cd', 'pwd', 'cat', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'grep', 'find']
          const matches = basicCommands.filter(cmd => cmd.startsWith(currentInputRef.current))
          if (matches.length === 1) {
            const completion = matches[0].slice(currentInputRef.current.length) + ' '
            terminal.write(completion)
            currentInputRef.current += completion
          }
        } else if (data >= ' ' && data <= '~' || data.charCodeAt(0) > 127) {
          // 通常の文字入力
          terminal.write(data)
          currentInputRef.current += data
        }
      }),

      terminal.onKey(({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
        // Ctrl+C: 現在のコマンドをキャンセル
        if (domEvent.ctrlKey && domEvent.key === 'c') {
          domEvent.preventDefault()
          terminal.writeln('\r\n^C')
          currentInputRef.current = ''
          const prompt = generatePrompt(currentDirectory)
          terminal.write(prompt)
        }
        // Ctrl+L: 画面クリア
        else if (domEvent.ctrlKey && domEvent.key === 'l') {
          domEvent.preventDefault()
          terminal.clear()
          const prompt = generatePrompt(currentDirectory)
          terminal.write(prompt)
        }
      })
    ]

    setIsConnected(true)

    // クリーンアップ
    return () => {
      disposables.forEach(d => d.dispose())
      terminal.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      setIsConnected(false)
    }
  }, [xterm, isDarkMode])

  // ウィンドウリサイズ対応
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit()
        } catch (error) {
          console.error('Failed to fit terminal:', error)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    const timer = setTimeout(handleResize, 100)

    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timer)
    }
  }, [isConnected])

  // 画面クリア
  const clearScreen = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear()
      const prompt = generatePrompt(currentDirectory)
      xtermRef.current.write(prompt)
    }
  }, [currentDirectory, generatePrompt])



  return (
    <Card className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Terminal (xterm.js)</span>
          {isConnected && <span className="text-xs text-green-500">●</span>}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearScreen}
            className="h-6 w-6 p-0"
            title="Clear screen (Ctrl+L)"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
              title="Close terminal"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div 
          ref={terminalRef}
          className="h-full w-full"
          style={{
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden'
          }}
          onClick={() => xtermRef.current?.focus()}
        />
        <div className={`px-3 py-1 text-xs ${isDarkMode ? 'text-gray-400 bg-gray-800' : 'text-gray-600 bg-gray-50'} border-t`}>
          Use ↑/↓ for history, Tab for completion, Ctrl+C to interrupt, Ctrl+L to clear
        </div>
      </CardContent>
    </Card>
  )
}