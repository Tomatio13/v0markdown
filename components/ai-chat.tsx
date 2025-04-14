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
  getEditorContent?: () => string
  isDarkMode?: boolean
  clearMessages: () => void
  setInput?: (value: string) => void
  append?: (message: { content: string, role: 'user' | 'assistant' | 'system' | 'function' }) => Promise<void>
}

export const AIChat = ({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  onInsertToEditor,
  getEditorContent,
  isDarkMode = false,
  clearMessages,
  setInput,
  append,
}: AIChatProps) => {

  const handleInsertToEditor = (text: string) => {
    if (onInsertToEditor) {
      onInsertToEditor(text);
    }
  };

  // コンポーネントマウント時にgetEditorContent関数をチェック
  useEffect(() => {
    if (getEditorContent) {
      try {
        const content = getEditorContent();
        console.log('エディタ内容のチェック (マウント時):', content ? content.substring(0, 50) + '...' : 'エディタ内容が空です');
      } catch (err) {
        console.error('getEditorContent関数エラー:', err);
      }
    } else {
      console.warn('getEditorContent関数が提供されていません');
    }
  }, [getEditorContent]);

  // 直接APIを呼び出す方法を追加
  const submitWithEditorContent = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // デバッグ: 入力内容を確認
    console.log('元の入力内容:', input);
    console.log('@editorキーワードの有無:', input.includes('@editor'));
    console.log('getEditorContent関数の有無:', !!getEditorContent);
    
    try {
      if (input.includes('@editor') && getEditorContent) {
        // エディタ内容を取得
        const editorContent = getEditorContent();
        console.log('取得したエディタ内容:', editorContent.substring(0, 100) + '...');
        
        // 入力を置換
        const processedInput = input.replace('@editor', `\n\n### エディタ内容:\n\`\`\`\n${editorContent}\n\`\`\`\n`);
        
        console.log('AIに送信する内容:', processedInput.substring(0, 100) + '...');
        
        // append APIを使用して直接メッセージを送信（もし利用可能なら）
        if (append) {
          console.log('append APIを使用してメッセージを送信します');
          // 入力フィールドをクリア
          if (setInput) {
            setInput('');
          }
          
          // ユーザーメッセージを追加
          await append({ 
            content: processedInput,
            role: 'user'
          });
          
          return;
        }
        
        // appendがない場合はフォールバック方法を使用
        console.log('フォールバック送信方法を使用します');
        
        // 通常の方法でフォームを送信
        // 入力フィールドを一時的に処理済みテキストに変更
        handleInputChange({ target: { value: processedInput } } as React.ChangeEvent<HTMLInputElement>);
        
        // 少し遅延してから送信
        setTimeout(() => {
          const fakeEvent = {
            preventDefault: () => {}
          } as React.FormEvent<HTMLFormElement>;
          
          handleSubmit(fakeEvent);
          
          // 送信後に入力フィールドを元の値に戻す（ただし入力は空にする）
          setTimeout(() => {
            if (setInput) {
              setInput('');
            } else {
              handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
            }
          }, 100);
        }, 50);
      } else {
        // 通常の送信処理
        handleSubmit(e);
      }
    } catch (err) {
      console.error('送信処理エラー:', err);
      // エラー時は通常送信
      handleSubmit(e);
    }
  }, [input, handleSubmit, handleInputChange, getEditorContent, setInput, append]);

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
      
      <form onSubmit={submitWithEditorContent} className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-[#2c2c2c]' : 'border-gray-200 bg-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="AIに質問する... (@editorでエディタ内容を取得)"
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