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
  onToggleVimMode
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
    <div className="w-auto border-t border-border/40 bg-[#171717] flex items-center text-xs text-foreground h-7 sticky bottom-0 left-[33px] right-[33px] z-50 mx-[33px]">
      <div className="w-full flex items-center justify-between overflow-hidden px-2 py-1">
        {/* 左側エリア - タブリスト */}
        <div className="flex items-center overflow-hidden" style={{ width: '350px', minWidth: '350px', maxWidth: '350px' }}>
          {/* タブリスト - 完全左寄せ */}
          <div className="overflow-x-auto overflow-y-hidden scrollbar-hide" style={{ width: '350px', minWidth: '350px', maxWidth: '350px', flexShrink: 0, paddingLeft: 0 }}>
            <style jsx global>{`
              /* スクロールバーを強制的に非表示 */
              .tabs-container::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
              .tabs-container {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
                overflow-y: hidden !important;
              }
              /* 横スクロールバーも非表示 */
              .horizontal-tabs {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
              }
              .horizontal-tabs::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
            `}</style>
            <Tabs value={activeTabId} onValueChange={handleTabChange} className="w-full">
              <TabsList className="h-5 flex justify-start bg-transparent tabs-container">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "h-5 px-1.5 text-[10px] text-muted-foreground/90 data-[state=active]:bg-muted/80 data-[state=active]:text-foreground flex items-center gap-1 relative",
                      tab.isUnsaved && "after:content-['*'] after:ml-0.5"
                    )}
                    style={{ width: '70px', minWidth: '70px', maxWidth: '70px', flexShrink: 0 }}
                  >
                    <span className="truncate">{tab.title}</span>
                    <div
                      className="opacity-50 hover:opacity-100 ml-0.5 h-3 w-3 flex items-center justify-center rounded-full hover:bg-muted-foreground/20 cursor-pointer flex-shrink-0"
                      onClick={(e) => handleTabClose(e, tab.id)}
                      aria-label="Close tab"
                      title="タブを閉じる"
                    >
                      <X className="h-2 w-2" />
                    </div>
                  </TabsTrigger>
                ))}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 rounded-sm flex-shrink-0 text-muted-foreground/90 hover:text-foreground"
                  onClick={onTabAdd}
                  aria-label="New tab"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
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
            {isVimMode && <span className="ml-1 font-bold text-green-500 text-[10px]">VIM</span>}
          </div>
        </div>
      </div>
    </div>
  )
}