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
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
      <div className={`flex justify-between items-center px-4 py-2 ${isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
        <h3 className="text-lg font-medium">AIチャット</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={clearMessages}
          disabled={isLoading || messages.length === 0}
          className={`${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : ''}`}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          クリア
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <Card 
              key={message.id} 
              className={`
                ${message.role === 'user' 
                  ? isDarkMode 
                    ? 'bg-blue-900/30 ml-8 border-blue-800' 
                    : 'bg-primary/10 ml-8' 
                  : isDarkMode 
                    ? 'bg-gray-800 mr-8 border-gray-700' 
                    : 'bg-muted mr-8'
                }
              `}
            >
              <CardContent className="p-3">
                <div>
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
                {message.role === 'assistant' && (
                  <Button
                    size="sm"
                    variant={isDarkMode ? "secondary" : "ghost"}
                    onClick={() => handleInsertToEditor(message.content)}
                    className="mt-2 text-xs"
                  >
                    エディタに挿入
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {isLoading && (
            <Card className={isDarkMode ? "bg-gray-800 mr-8 border-gray-700" : "bg-muted mr-8"}>
              <CardContent className="p-3">
                <p className="text-sm">回答を生成中...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSubmit} className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="AIに質問する..."
            className={`flex-1 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            variant={isDarkMode ? "secondary" : "default"}
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  )
} 