"use client"

import { useState, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  onInsertToEditor?: (text: string) => void
  isDarkMode?: boolean
}

export const AIChat = ({ onInsertToEditor, isDarkMode = false }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // AIの応答を取得
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error('AIからの応答でエラーが発生しました');
      }
      
      const data = await response.json();
      
      // AIの応答を追加
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || '応答を生成できませんでした'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AIチャットエラー:', error);
      // エラーメッセージを表示
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertToEditor = (text: string) => {
    if (onInsertToEditor) {
      onInsertToEditor(text);
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
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