"use client"

import { useEffect, useCallback } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import type { Message, UseChatHelpers } from 'ai/react'

interface AIChatProps extends Pick<UseChatHelpers, 'messages' | 'input' | 'handleInputChange' | 'handleSubmit' | 'isLoading'> {
  onInsertToEditor?: (text: string) => void
  isDarkMode?: boolean
  clearMessages: () => void
}

export const AIChat = ({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  onInsertToEditor,
  isDarkMode = false,
  clearMessages,
}: AIChatProps) => {

  const handleInsertToEditor = (text: string) => {
    if (onInsertToEditor) {
      onInsertToEditor(text);
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#2c2c2c] text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      <div className={`flex justify-between items-center px-4 py-2 ${isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
        <h3 className="text-base font-semibold">AIチャット</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          disabled={isLoading || messages.length === 0}
          className={`text-xs px-2 py-1 ${isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-200'}`}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          クリア
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((message) => (
            <Card
              key={message.id}
              className={`
                max-w-[90%] rounded-lg shadow-sm
                ${message.role === 'user'
                  ? isDarkMode
                    ? 'bg-[#3a3d41] ml-auto'
                    : 'bg-blue-50 ml-auto'
                  : isDarkMode
                    ? 'bg-[#3a3d41] mr-auto'
                    : 'bg-white mr-auto'
                }
                ${isDarkMode ? 'border-none' : 'border border-gray-200'}
              `}
            >
              <CardContent className="p-3">
                <div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                </div>
                {message.role === 'assistant' && !isLoading && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleInsertToEditor(message.content)}
                    className={`mt-2 text-xs px-2 py-1 ${isDarkMode ? 'text-blue-400 hover:bg-gray-600' : 'text-blue-600 hover:bg-gray-100'}`}
                  >
                    エディタに挿入
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {isLoading && (
            <Card className={`max-w-[90%] mr-auto rounded-lg shadow-sm ${isDarkMode ? 'bg-[#3a3d41] border-none' : 'bg-white border border-gray-200'}`}>
              <CardContent className="p-3">
                <p className="text-sm animate-pulse">回答を生成中...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSubmit} className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-[#2c2c2c]' : 'border-gray-200 bg-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="AIに質問する..."
            className={`flex-1 rounded-md text-sm ${isDarkMode ? 'bg-[#3a3d41] border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500' : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className={`rounded-md ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400'
            }`}
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  )
} 