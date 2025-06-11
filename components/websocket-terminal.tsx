"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Terminal as TerminalIcon, X, Trash2 } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Copy, FileText } from 'lucide-react'

interface WebSocketTerminalProps {
  isDarkMode?: boolean
  onClose?: () => void
  onInsertToEditor?: (text: string) => void
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

export const WebSocketTerminal: React.FC<WebSocketTerminalProps> = ({ 
  isDarkMode = false, 
  onClose,
  onInsertToEditor 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [selectedText, setSelectedText] = useState<string>('')
  
  const xterm = useXTerm()

  // ターミナルサイズをサーバーに送信する関数
  const sendTerminalSize = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && xtermRef.current) {
      const cols = xtermRef.current.cols
      const rows = xtermRef.current.rows
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        cols: cols,
        rows: rows
      }))
      console.log(`Terminal size sent: ${cols}x${rows}`)
    }
  }, [])

  // 選択テキストを取得する関数
  const getSelectedTerminalText = useCallback(() => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection()
      return selection || ''
    }
    return ''
  }, [])

  // コピー機能
  const handleCopy = useCallback(() => {
    const text = getSelectedTerminalText()
    if (text) {
      navigator.clipboard.writeText(text)
      setSelectedText('')
    }
  }, [getSelectedTerminalText])

  // エディタに挿入機能
  const handleInsertToEditor = useCallback(() => {
    const text = getSelectedTerminalText()
    if (text && onInsertToEditor) {
      const codeBlock = `\`\`\`bash\n${text}\n\`\`\``
      onInsertToEditor(codeBlock)
      setSelectedText('')
    }
  }, [getSelectedTerminalText, onInsertToEditor])

  // 選択テキストの更新を監視
  useEffect(() => {
    if (xtermRef.current) {
      const terminal = xtermRef.current
      const updateSelection = () => {
        const selection = terminal.getSelection()
        setSelectedText(selection || '')
      }
      
      // 選択変更イベントをリスン
      const disposable = terminal.onSelectionChange(updateSelection)
      
      // クリーンアップ関数でイベントリスナーを削除
      return () => {
        if (disposable && disposable.dispose) {
          disposable.dispose()
        }
      }
    }
  }, [xtermRef.current]) // isConnectedではなくxtermRef.currentに依存

  // WebSocket接続を確立
  const connectWebSocket = useCallback(async () => {
    try {
      if (wsRef.current) return

      // APIからWebSocketサーバーの接続情報を取得
      const response = await fetch('/api/terminal-ws')
      const connectionInfo = await response.json()
      const wsUrl = connectionInfo.websocketUrl
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionStatus('connected')
        setIsConnected(true)
        if (xtermRef.current) {
          xtermRef.current.writeln('\r\n\x1b[32mWebSocket接続成功、サーバーからの応答を待っています...\x1b[0m')
          // 接続後にターミナルサイズを送信
          setTimeout(() => {
            sendTerminalSize()
          }, 100)
          // 自動スクロールを最下部に
          setTimeout(() => {
            if (xtermRef.current) {
              xtermRef.current.scrollToLine(xtermRef.current.buffer.active.length)
            }
          }, 10)
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          switch (message.type) {
            case 'connected':
              if (xtermRef.current) {
                xtermRef.current.writeln('\r\n\x1b[32mターミナル接続完了\x1b[0m\r\n')
                // 自動スクロールを最下部に
                setTimeout(() => {
                  if (xtermRef.current) {
                    xtermRef.current.scrollToLine(xtermRef.current.buffer.active.length)
                  }
                }, 10)
              }
              break
              
                          case 'output':
                if (xtermRef.current) {
                  xtermRef.current.write(message.data)
                  // 出力後に自動スクロールを最下部に
                  setTimeout(() => {
                    if (xtermRef.current) {
                      xtermRef.current.scrollToLine(xtermRef.current.buffer.active.length)
                    }
                  }, 10)
                }
                break
              
            case 'exit':
              if (xtermRef.current) {
                xtermRef.current.writeln('\r\n\x1b[31mTerminal process exited\x1b[0m')
                // 自動スクロールを最下部に
                setTimeout(() => {
                  if (xtermRef.current) {
                    xtermRef.current.scrollToLine(xtermRef.current.buffer.active.length)
                  }
                }, 10)
              }
              break
              
            case 'error':
              console.error('サーバーエラー:', message.message)
              if (xtermRef.current) {
                xtermRef.current.writeln(`\r\n\x1b[31mサーバーエラー: ${message.message}\x1b[0m`)
                // 自動スクロールを最下部に
                setTimeout(() => {
                  if (xtermRef.current) {
                    xtermRef.current.scrollToLine(xtermRef.current.buffer.active.length)
                  }
                }, 10)
              }
              break
          }
        } catch (error) {
          console.error('WebSocketメッセージ解析エラー:', error)
          console.error('受信データ:', event.data)
          
          if (typeof event.data === 'string' && event.data.includes('<!DOCTYPE')) {
            console.error('HTMLページが返されました - WebSocketエンドポイントが見つからない可能性があります')
            if (xtermRef.current) {
              xtermRef.current.writeln('\r\n\x1b[31mエラー: WebSocketエンドポイントが見つかりません\x1b[0m')
              xtermRef.current.writeln('サーバーが正しく起動していることを確認してください')
              // 自動スクロールを最下部に
              setTimeout(() => {
                if (xtermRef.current) {
                  xtermRef.current.scrollToLine(xtermRef.current.buffer.active.length)
                }
              }, 10)
            }
          }
        }
      }

      ws.onclose = (event) => {
        const closeMessages: { [key: number]: string } = {
          1000: '正常な接続終了',
          1001: 'サーバーが停止中または再起動中',
          1002: 'プロトコルエラー',
          1003: 'サポートされていないデータタイプ',
          1005: '理由なしでの接続終了',
          1006: '異常な接続終了（通常はサーバーが利用できない状態）',
          1007: '無効なデータを受信',
          1008: 'ポリシー違反',
          1009: 'メッセージが大きすぎる',
          1010: '拡張の合意に失敗',
          1011: 'サーバー内部エラー'
        }
        
        const errorMessage = closeMessages[event.code] || `不明なエラー（コード: ${event.code}）`
        
        if (!event.wasClean) {
          console.error(`WebSocket接続が異常終了しました。${errorMessage}`)
          console.error(`接続先URL: ${wsUrl}`)
          console.error(`接続状況の詳細:`, {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            timestamp: new Date().toISOString()
          })
          
          if (xtermRef.current) {
            xtermRef.current.writeln(`\r\n\x1b[31mWebSocket接続エラー: ${errorMessage}\x1b[0m`)
            xtermRef.current.writeln(`接続先: ${wsUrl}`)
            if (event.code === 1006) {
              xtermRef.current.writeln('サーバーが起動していることを確認してください')
            }
          }
        }
        setConnectionStatus('disconnected')
        setIsConnected(false)
        wsRef.current = null
      }
    } catch (error) {
      console.error('WebSocket接続失敗:', error)
      setConnectionStatus('error')
    }
  }, [])

  // WebSocket接続を切断
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [])

  // ターミナル初期化
  useEffect(() => {
    if (!xterm || !terminalRef.current || xtermRef.current) return

    const { Terminal, FitAddon, WebLinksAddon } = xterm

    // 動的スクロールバックサイズを計算する関数
    const calculateScrollback = (rows: number) => {
      // ターミナルの行数に基づいてスクロールバックサイズを計算
      // 最小500行、最大5000行、通常は表示行数の10倍
      const baseScrollback = Math.max(500, Math.min(5000, rows * 10))
      return baseScrollback
    }

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
      scrollback: 1000, // 初期値、後で動的に更新
      tabStopWidth: 4,
      convertEol: true, // 改行コードの自動変換を有効化
      allowProposedApi: true, // 提案されたAPIを有効化
      minimumContrastRatio: 1, // tmux表示の改善
      fastScrollModifier: 'alt' // 高速スクロール用
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())
    
    terminal.open(terminalRef.current)
    
    // 初期化完了後にfitとスクロール設定を実行
    setTimeout(() => {
      if (fitAddon && terminal) {
        fitAddon.fit()
        // 再度サイズを送信（tmux対応）
        setTimeout(() => {
          sendTerminalSize()
        }, 50)
        setTimeout(() => {
          terminal.scrollToLine(terminal.buffer.active.length)
        }, 100)
      }
    }, 100)
    
    // 追加の初期化処理（より確実にするため）
    setTimeout(() => {
      if (fitAddon && terminal) {
        fitAddon.fit()
        // 再度サイズを送信（tmux対応）
        setTimeout(() => {
          sendTerminalSize()
        }, 50)
        setTimeout(() => {
          terminal.scrollToLine(terminal.buffer.active.length)
        }, 100)
      }
    }, 300)
    
    // さらに確実にするための最終調整
    setTimeout(() => {
      if (fitAddon && terminal) {
        fitAddon.fit()
        sendTerminalSize()
      }
    }, 500)
    
    xtermRef.current = terminal
    fitAddonRef.current = fitAddon
    
    // 選択テキストの更新を監視（ターミナル初期化時に設定）
    const updateSelection = () => {
      const selection = terminal.getSelection()
      setSelectedText(selection || '')
    }
    terminal.onSelectionChange(updateSelection)
    
    // キーボード入力処理を追加
    terminal.onData((data: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'input',
          data: data
        }))
      }
    })
    
    connectWebSocket().catch(console.error)

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit()
          // リサイズ後にスクロールバックサイズを更新
          const newScrollback = calculateScrollback(xtermRef.current.rows)
          xtermRef.current.options.scrollback = newScrollback
          
          // ターミナルサイズをサーバーに送信（tmux対応）
          setTimeout(() => {
            sendTerminalSize()
          }, 100)
          
          // リサイズ後に最下部にスクロール
          setTimeout(() => {
            if (xtermRef.current) {
              xtermRef.current.scrollToLine(xtermRef.current.buffer.active.length)
            }
          }, 50)
        } catch (error) {
          console.error('Failed to fit terminal:', error)
        }
      }
    }
    window.addEventListener('resize', handleResize)
    
    // ResizeObserverでターミナルコンテナのサイズ変更を監視
    let resizeObserver: ResizeObserver | null = null
    let resizeTimeout: NodeJS.Timeout | null = null
    if (terminalRef.current) {
      resizeObserver = new ResizeObserver(() => {
        // デバウンス処理でパフォーマンス向上
        if (resizeTimeout) {
          clearTimeout(resizeTimeout)
        }
        resizeTimeout = setTimeout(() => {
          handleResize()
          // tmux用の追加リサイズ処理
          setTimeout(() => {
            if (fitAddonRef.current && xtermRef.current) {
              fitAddonRef.current.fit()
              sendTerminalSize()
            }
          }, 50)
        }, 100)
      })
      resizeObserver.observe(terminalRef.current)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
      terminal.dispose()
      xtermRef.current = null
      disconnectWebSocket()
    }
  }, [xterm, isDarkMode, connectWebSocket, disconnectWebSocket, sendTerminalSize])

  // 画面クリア
  const clearScreen = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear()
    }
  }, [])

  // 再接続
  const reconnect = useCallback(() => {
    disconnectWebSocket()
    setTimeout(() => {
      connectWebSocket().catch(console.error)
    }, 1000)
  }, [connectWebSocket, disconnectWebSocket])

  // 接続状態の表示
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500'
      case 'connecting': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '●'
      case 'connecting': return '○'
      case 'error': return '●'
      default: return '○'
    }
  }

  return (
    <Card className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 border-[#171717]' : 'bg-white border-gray-200'}`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isDarkMode ? 'bg-[#171717]' : ''}`}>
        <div className="flex items-center space-x-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Terminal</span>
          <span className={`text-xs ${getStatusColor()}`}>{getStatusText()}</span>
          <span className="text-xs text-gray-500">{connectionStatus}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearScreen}
            className="h-6 w-6 p-0"
            title="Clear screen"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {connectionStatus === 'error' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reconnect}
              className="h-6 w-6 p-0"
              title="Reconnect"
            >
              🔄
            </Button>
          )}
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
      <CardContent className="flex-1 p-0 flex flex-col">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div 
              ref={terminalRef}
              className="flex-1 w-full"
              style={{
                backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
                position: 'relative',
                zIndex: 1,
                overflow: 'hidden',
                minHeight: 0, // flexboxでの縮小を許可
                paddingBottom: '2px' // ステータスバーとの間隔を確保
              }}
              onContextMenu={() => {
                // Context Menu が開かれる際に選択テキストを更新
                if (xtermRef.current) {
                  const selection = xtermRef.current.getSelection()
                  setSelectedText(selection || '')
                }
              }}
            />
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem 
              onClick={handleCopy}
              disabled={!selectedText && !getSelectedTerminalText()}
            >
              <Copy className="mr-2 h-4 w-4" />
              <span>コピー</span>
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={handleInsertToEditor}
              disabled={!selectedText && !getSelectedTerminalText()}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>エディタに挿入</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <div className={`px-3 py-1 text-xs ${isDarkMode ? 'text-gray-400 bg-gray-800 border-t-[#171717]' : 'text-gray-600 bg-gray-50 border-t'} flex-shrink-0 relative z-10`}>
          WebSocket Terminal - Full interactive support
        </div>
      </CardContent>
    </Card>
  )
}