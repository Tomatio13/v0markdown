"use client"

import { AIChat } from './ai-chat'
import { WebSocketTerminal as TerminalComponent } from './websocket-terminal'
import React, { useState } from 'react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import type { Message, UseChatHelpers } from 'ai/react';

interface TripleLayoutProps extends Pick<UseChatHelpers, 'messages' | 'input' | 'handleInputChange' | 'isLoading'> {
  editorComponent: React.ReactNode
  previewComponent: React.ReactNode // 使用しないが互換性のために残す
  onAIContentInsert: (text: string) => void
  isDarkMode?: boolean
  clearMessages: () => void
  driveEnabled?: boolean
  driveFileListComponent?: React.ReactNode
  getEditorContent?: () => string
  getSelectedEditorContent?: () => string | null
  replaceSelectedEditorContent?: (text: string) => void
  setInput?: (value: string | ((prevInput: string) => string)) => void
  append?: any // aiパッケージの完全な型と互換性を持たせる
  tocVisible?: boolean
  tocComponent?: React.ReactNode
  terminalVisible?: boolean
}

export const TripleLayout = React.memo(({ 
  editorComponent, 
  previewComponent, // 使用しないが互換性のために残す
  onAIContentInsert,
  isDarkMode = false,
  messages,
  input,
  handleInputChange,
  isLoading,
  clearMessages,
  driveEnabled = false,
  driveFileListComponent,
  getEditorContent,
  getSelectedEditorContent,
  replaceSelectedEditorContent,
  setInput,
  append,
  tocVisible = false,
  tocComponent,
  terminalVisible = false
}: TripleLayoutProps) => {
  // エディタとプレビューの比率状態
  const [editorPreviewRatio, setEditorPreviewRatio] = useState({
    editor: 50,
    preview: 50
  });

  // サイズ変更時のハンドラー
  const handleResizeEditorPreview = (sizes: number[]) => {
    if (sizes.length >= 2) {
      setEditorPreviewRatio({
        editor: sizes[0],
        preview: sizes[1]
      });
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className={`h-full ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
      {/* Google Driveパネル（有効時のみ表示） */}
      {driveEnabled && driveFileListComponent && (
        <>
          <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
            {driveFileListComponent}
          </ResizablePanel>
          <ResizableHandle 
            withHandle 
            className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} 
          />
        </>
      )}
      
      {/* 目次パネル（Drive無効かつToc有効時のみ表示） */}
      {!driveEnabled && tocVisible && tocComponent && (
        <>
          <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
            {tocComponent}
          </ResizablePanel>
          <ResizableHandle 
            withHandle 
            className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} 
          />
        </>
      )}
      
      {/* メインコンテンツエリア */}
      <ResizablePanel 
        defaultSize={driveEnabled ? 85 : (!driveEnabled && tocVisible ? 85 : 100)}
        minSize={75}
      >
        <ResizablePanelGroup 
          direction="vertical" 
          className="h-full"
        >
          {/* 上部: エディタとAIチャット */}
          <ResizablePanel 
            defaultSize={terminalVisible ? 70 : 100}
            minSize={40}
          >
            <ResizablePanelGroup 
              direction="horizontal" 
              className="h-full"
              onLayout={handleResizeEditorPreview}
            >
              {/* エディタパネル */}
              <ResizablePanel 
                defaultSize={editorPreviewRatio.editor}
                minSize={30} 
                className={isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}
              >
                {editorComponent}
              </ResizablePanel>
              
              <ResizableHandle 
                withHandle 
                className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} 
              />
              
              {/* AIチャットパネル */}
              <ResizablePanel 
                defaultSize={editorPreviewRatio.preview}
                minSize={30} 
                className={isDarkMode ? 'bg-[#2c2c2c]' : 'bg-gray-100'}
              >
                <AIChat 
                  onInsertToEditor={onAIContentInsert}
                  isDarkMode={isDarkMode}
                  messages={messages}
                  input={input}
                  handleInputChange={handleInputChange}
                  isLoading={isLoading}
                  clearMessages={clearMessages}
                  getEditorContent={getEditorContent}
                  getSelectedEditorContent={getSelectedEditorContent}
                  replaceSelectedEditorContent={replaceSelectedEditorContent}
                  setInput={setInput}
                  append={append}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          
          {/* ターミナルパネル（表示時のみ） */}
          {terminalVisible && (
            <>
              <ResizableHandle 
                withHandle 
                className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} 
              />
              <ResizablePanel 
                defaultSize={30}
                minSize={20}
                maxSize={60}
                className={isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}
              >
                <TerminalComponent isDarkMode={isDarkMode} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}) 