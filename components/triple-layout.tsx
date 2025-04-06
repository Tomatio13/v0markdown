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
}: TripleLayoutProps) => {
  return (
    <ResizablePanelGroup direction="horizontal" className={`h-full ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
      {/* エディタパネル */}
      <ResizablePanel defaultSize={50} minSize={30} className={isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}>
        {editorComponent}
      </ResizablePanel>
      
      <ResizableHandle 
        withHandle 
        className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} 
      />
      
      {/* AIチャットパネル */}
      <ResizablePanel defaultSize={50} minSize={30} className={isDarkMode ? 'bg-gray-900' : 'bg-white'}>
        <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
          {/* タイトル表示を削除 */}
          
          <div className="flex-1 overflow-hidden">
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
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
} 