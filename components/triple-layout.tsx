"use client"

import { AIChat } from './ai-chat'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import type { Message, UseChatHelpers } from 'ai/react';

interface TripleLayoutProps extends Pick<UseChatHelpers, 'messages' | 'input' | 'handleInputChange' | 'handleSubmit' | 'isLoading'> {
  editorComponent: React.ReactNode
  previewComponent: React.ReactNode // 使用しないが互換性のために残す
  onAIContentInsert: (text: string) => void
  isDarkMode?: boolean
  clearMessages: () => void
  driveEnabled?: boolean
  driveFileListComponent?: React.ReactNode
}

export const TripleLayout = ({ 
  editorComponent, 
  previewComponent, // 使用しないが互換性のために残す
  onAIContentInsert,
  isDarkMode = false,
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  clearMessages,
  driveEnabled = false,
  driveFileListComponent
}: TripleLayoutProps) => {
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
      
      {/* エディタパネル */}
      <ResizablePanel 
        defaultSize={driveEnabled ? 50 : 50} 
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
        defaultSize={driveEnabled ? 35 : 50} 
        minSize={30} 
        className={isDarkMode ? 'bg-[#2c2c2c]' : 'bg-gray-100'}
      >
        <AIChat 
          onInsertToEditor={onAIContentInsert}
          isDarkMode={isDarkMode}
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          clearMessages={clearMessages}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
} 