"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Plus, MessageCircle, Mic, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface DocumentTab {
  id: string
  title: string
  content: string
  isUnsaved: boolean
  previewType?: string | null
}

interface DocumentTabsProps {
  tabs: DocumentTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabAdd: () => void
  cursorPosition?: { line: number, col: number }
  editorMode?: string
  previewMode?: string | null
  isVimMode?: boolean
  onToggleTripleLayout?: () => void
  isListening?: boolean
  onToggleVoiceInput?: () => void
  onToggleVimMode?: () => void
  isDarkMode?: boolean
}

export function DocumentTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd,
  cursorPosition = { line: 1, col: 1 },
  editorMode = 'Markdown',
  previewMode = null,
  isVimMode = false,
  onToggleTripleLayout,
  isListening = false,
  onToggleVoiceInput,
  onToggleVimMode,
  isDarkMode = false
}: DocumentTabsProps) {
  // タブの表示が更新されたらスクロールエリアの位置を調整
  const handleTabChange = useCallback((tabId: string) => {
    onTabChange(tabId)
  }, [onTabChange])

  const handleTabClose = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    onTabClose(tabId)
  }, [onTabClose])

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  return (
    <div className={`w-auto border-t ${isDarkMode ? 'border-border/40 bg-[#171717]' : 'border-gray-200 bg-gray-100'} flex items-center text-xs text-foreground h-7 sticky bottom-0 z-10`}>
      <div className="w-full flex items-center justify-end overflow-hidden px-2 py-1">
        {/* 右側エリア - ステータス情報 */}
        <div className="flex items-center justify-end gap-1 flex-shrink-0 ml-auto mr-3">
          {/* AIチャットトグルボタン */}
          {onToggleTripleLayout && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-1 text-xs flex-shrink-0 mr-1 text-muted-foreground hover:text-foreground" 
              onClick={onToggleTripleLayout}
            >
              <MessageCircle className="h-3 w-3.5 mr-0.5" />
              <span className="whitespace-nowrap text-[10px]">AIチャット</span>
            </Button>
          )}
          {/* 音声入力ボタン */}
          {onToggleVoiceInput && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-6 px-1 text-xs flex-shrink-0 mr-1 ${isListening ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={onToggleVoiceInput}
                  >
                    <Mic className={isListening ? "h-3 w-3.5 mr-0.5 animate-pulse" : "h-3 w-3.5 mr-0.5"} />
                    <span className="whitespace-nowrap text-[10px]">{isListening ? "音声入力中" : "音声入力"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isListening ? "音声入力を停止" : "音声入力を開始"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Vimモード切り替えボタン */}
          {onToggleVimMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-6 px-1 text-xs flex-shrink-0 mr-1 ${isVimMode ? "text-green-500" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={onToggleVimMode}
                  >
                    <Terminal className="h-3 w-3.5 mr-0.5" />
                    <span className="whitespace-nowrap text-[10px]">{isVimMode ? "VIM ON" : "VIM OFF"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isVimMode ? "Vimモードを無効化" : "Vimモードを有効化"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* カーソル位置表示 - 固定幅 */}
          <div className="text-right flex-shrink-0 whitespace-nowrap mr-1 text-muted-foreground/90" style={{ width: '85px', minWidth: '85px' }}>
            <span className="text-[10px]">Ln {cursorPosition?.line || 1}, Col {cursorPosition?.col || 1}</span>
          </div>
          
          {/* モード表示 - 固定幅 */}
          <div className="text-right flex-shrink-0 whitespace-nowrap text-muted-foreground/90" style={{ width: '210px', minWidth: '210px' }}>
            <span className="text-[10px]">Mode: {editorMode}</span>
            {previewMode && <span className="ml-1 text-[10px]">Preview: {previewMode}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}