"use client"

import { useEffect, useCallback, useState } from 'react'
import { Send, Trash2, BrainCircuit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TextareaAutosize from 'react-textarea-autosize'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Message, CreateMessage } from 'ai/react'

interface AvailableModel {
  id: string;
  name: string;
}

interface AIChatProps {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  clearMessages: () => void;
  setInput?: (value: string) => void;
  append?: (message: CreateMessage, options?: { body?: Record<string, any> }) => Promise<string | null | undefined>;
  onInsertToEditor?: (text: string) => void;
  getEditorContent?: () => string;
  isDarkMode?: boolean;
}

export const AIChat = ({
  messages,
  input,
  handleInputChange,
  isLoading,
  clearMessages,
  setInput,
  append,
  onInsertToEditor,
  getEditorContent,
  isDarkMode = false,
}: AIChatProps) => {
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        const response = await fetch('/api/chat');
        if (!response.ok) {
          throw new Error(`モデルリストの取得に失敗しました: ${response.statusText}`);
        }
        const models: AvailableModel[] = await response.json();
        setAvailableModels(models);
        if (models.length > 0 && !selectedModel) {
          setSelectedModel(models[0].id);
        }
      } catch (error) {
        console.error("利用可能なモデルの取得エラー:", error);
      }
    };

    if (!selectedModel) {
        fetchAvailableModels();
    }
  }, []);

  const handleInsertToEditor = (text: string) => {
    if (onInsertToEditor) {
      onInsertToEditor(text);
    }
  };

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

  const sendMessage = useCallback(async (content: string) => {
    if (!append) {
      console.error("append関数が提供されていません。");
      return;
    }
    if (!selectedModel) {
      console.error("送信するモデルが選択されていません。");
      return;
    }

    console.log(`モデル '${selectedModel}' を使用してメッセージを送信します。`);

    try {
      await append(
        { content, role: 'user' },
        { body: { model: selectedModel } }
      );
      if (setInput) {
        setInput('');
      }
    } catch (error) {
      console.error("メッセージ送信エラー:", error);
    }

  }, [append, selectedModel, setInput]);

  const handleFormSubmit = useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    if (!input.trim()) return;

    let contentToSend = input;

    if (input.includes('@editor') && getEditorContent) {
       try {
        const editorContent = getEditorContent();
        contentToSend = input.replace('@editor', `\n\n### エディタ内容:\n\`\`\`\n${editorContent}\n\`\`\`\n`);
        console.log('エディタ内容を含む送信コンテンツ:', contentToSend.substring(0, 100) + '...');
      } catch (err) {
        console.error('@editor 内容取得エラー:', err);
        contentToSend = input;
      }
    }

    await sendMessage(contentToSend);

  }, [input, getEditorContent, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleFormSubmit();
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#2c2c2c] text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      <div className={`flex justify-between items-center px-4 py-2 ${isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
        <h3 className="text-base font-semibold flex items-center">
          <BrainCircuit className="mr-2 h-5 w-5" />
          AIチャット
        </h3>
        <div className="flex items-center gap-2">
          {availableModels.length > 0 && (
             <Select
               value={selectedModel}
               onValueChange={setSelectedModel}
               disabled={isLoading}
             >
               <SelectTrigger className={`w-[180px] h-8 text-xs ${isDarkMode ? 'bg-[#3a3d41] border-gray-600' : 'bg-white'}`}>
                 <SelectValue placeholder="モデルを選択..." />
               </SelectTrigger>
               <SelectContent>
                 {availableModels.map((model) => (
                   <SelectItem key={model.id} value={model.id} className="text-xs">
                     {model.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
          )}
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
      
      <form onSubmit={handleFormSubmit} className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-[#2c2c2c]' : 'border-gray-200 bg-gray-100'}`}>
        <div className="flex items-start gap-2">
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="AIに質問する... (Shift+Enterで改行, @editorでエディタ内容を取得)"
            className={`flex-1 rounded-md text-sm resize-none border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? 'bg-[#3a3d41] border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500' : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            disabled={isLoading || availableModels.length === 0}
            minRows={1}
            maxRows={6}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim() || availableModels.length === 0 || !selectedModel}
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