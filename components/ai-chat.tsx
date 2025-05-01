"use client"

import React, { useEffect, useCallback, useState, useRef } from 'react'
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
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

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

// MessageItem コンポーネントを修正して Markdown パーサーを使用
const MessageItem = React.memo(({
  message,
  isLoading,
  isDarkMode,
  handleInsertToEditor,
}: {
  message: Message;
  isLoading: boolean;
  isDarkMode: boolean;
  handleInsertToEditor: (text: string) => void;
}) => {
    // 単純化したマークダウンレンダリング
    const MessageContent = React.useMemo(() => (
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {message.content.split('```').map((part, index) => {
          // コードブロックの処理
          if (index % 2 === 1) {
            // 言語指定があれば抽出
            const firstLineBreak = part.indexOf('\n');
            const language = firstLineBreak > 0 ? part.substring(0, firstLineBreak).trim() : '';
            const code = firstLineBreak > 0 ? part.substring(firstLineBreak + 1) : part;
            
            return (
              <div key={index} className="my-2 rounded overflow-hidden">
                {language && (
                  <div className={`px-2 py-1 text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                    {language}
                  </div>
                )}
                <pre className={`p-3 overflow-auto ${isDarkMode ? 'bg-[#1e1e1e] text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                  <code>{code}</code>
                </pre>
              </div>
            );
          } else {
            // 通常のテキスト
            return (
              <p key={index} style={{ whiteSpace: 'pre-wrap' }}>
                {part}
              </p>
            );
          }
        })}
      </div>
    ), [message.content, isDarkMode]);

    return (
        <div className="pb-3"> {/* Virtuosoのアイテム間のスペース */}
            <Card
                key={message.id} // key は Virtuoso の itemContent 内で適用
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
                    {MessageContent}
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
        </div>
    );
});
MessageItem.displayName = 'MessageItem';

// Virtuoso を使用する新しいメッセージリストコンポーネント
const MessageList = React.memo(({
  messages,
  isLoading,
  isDarkMode,
  handleInsertToEditor,
  virtuosoRef, // Virtuosoの制御用Ref
}: {
  messages: Message[];
  isLoading: boolean;
  isDarkMode: boolean;
  handleInsertToEditor: (text: string) => void;
  virtuosoRef: React.RefObject<VirtuosoHandle>;
}) => {
  console.log('Rendering MessageList (Virtuoso)');

  const renderLoader = () => {
    // ストリーミング中に重複してローディング表示が出ないように条件を調整
    if (isLoading && (!messages.length || messages[messages.length - 1]?.role === 'user')) {
        return (
            <div className="p-4 flex justify-center">
                <Card className={`max-w-[90%] mr-auto rounded-lg shadow-sm ${isDarkMode ? 'bg-[#3a3d41] border-none' : 'bg-white border border-gray-200'}`}>
                    <CardContent className="p-3">
                        <p className="text-sm animate-pulse">回答を生成中...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    return null;
  };

  return (
    <Virtuoso
      ref={virtuosoRef} // Ref を設定
      style={{ flex: 1 }} // 親要素の高さに追従させる
      data={messages} // 表示するデータ配列
      followOutput="smooth" // 新しい項目が追加されたらスムーズに追従スクロール
      itemContent={(index, message) => (
        // 個々のメッセージアイテムをレンダリング
        <MessageItem
          message={message}
          isLoading={isLoading} // 個々のアイテムではisLoadingは主に「挿入」ボタンの制御に使う
          isDarkMode={isDarkMode}
          handleInsertToEditor={handleInsertToEditor}
        />
      )}
      components={{ Footer: renderLoader }} // ローディング表示をフッターに追加
    />
  );
});
MessageList.displayName = 'MessageList';

// 応答完了時に自動的にスクロールする処理を追加
const useAutoScrollToBottom = (
  messages: Message[],
  isLoading: boolean,
  virtuosoRef: React.RefObject<VirtuosoHandle>
) => {
  // 前回のメッセージ数を保持
  const prevMessagesCountRef = useRef(messages.length);
  
  useEffect(() => {
    // ローディング状態が変わるたびに実行
    const currentCount = messages.length;
    const prevCount = prevMessagesCountRef.current;
    
    // 1. ローディングが完了した時
    // 2. 新しいメッセージが追加された時
    if ((!isLoading && prevCount < currentCount) || (!isLoading && messages.length > 0)) {
      // 少し遅延させてスクロール（レンダリング完了を待つ）
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          behavior: 'smooth',
        });
      }, 100);
    }
    
    // 現在のカウントを記録
    prevMessagesCountRef.current = currentCount;
  }, [isLoading, messages, virtuosoRef]);
};

export const AIChat = React.memo(({
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
  const virtuosoRef = useRef<VirtuosoHandle>(null); // Virtuoso の Ref を作成

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

    if (availableModels.length === 0) {
        fetchAvailableModels();
    }
  }, [availableModels, selectedModel]);

  // handleInsertToEditor を useCallback でメモ化
  const handleInsertToEditorCallback = useCallback((text: string) => {
    if (onInsertToEditor) {
      onInsertToEditor(text);
    }
  }, [onInsertToEditor]);

  // getEditorContent は変化しない想定だが念のため useCallback
  const getEditorContentCallback = useCallback(() => {
      if (getEditorContent) {
          try {
              const content = getEditorContent(); // この呼び出しでエラーが出ている
              console.log('エディタ内容のチェック (コールバック経由):', content ? content.substring(0, 50) + '...' : 'エディタ内容が空です');
              return content ?? ''; // getEditorContent が undefined を返す可能性も考慮
          } catch (err) {
              console.error('getEditorContent関数エラー:', err);
              return ''; // エラー時は空文字を返す
          }
      } else {
        console.warn('getEditorContent関数が提供されていません');
        return ''; // 関数が提供されていない場合は空文字を返す
      }
  }, [getEditorContent]);

  const sendMessage = useCallback(async (content: string) => {
    if (!append) {
      console.error("append関数が提供されていません。");
      return;
    }
    if (!selectedModel) {
      console.error("送信するモデルが選択されていません。");
      alert("使用するAIモデルを選択してください。");
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
      alert(`メッセージの送信中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    }

  }, [append, selectedModel, setInput]);

  // handleFormSubmit を useCallback でメモ化
   const handleFormSubmitCallback = useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    let contentToSend = trimmedInput;

    if (trimmedInput.includes('@editor')) {
        const editorContent = getEditorContentCallback(); // ここは OK
        // editorContent が確実に string 型になるように修正
        contentToSend = trimmedInput.replace('@editor', `\n\n### エディタ内容:\n\`\`\`\n${editorContent}\n\`\`\`\n`);
        console.log('エディタ内容を含む送信コンテンツ:', contentToSend.substring(0, 100) + '...');
    }

    await sendMessage(contentToSend);

  }, [input, getEditorContentCallback, sendMessage]);

  // handleKeyDown を useCallback でメモ化
  const handleKeyDownCallback = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // キーボードイベント自体のデフォルト動作（改行）は防ぐ
      if (!isLoading && input.trim()) {
        // 引数を渡さずに呼び出す
        handleFormSubmitCallback(); 
      }
    }
  }, [isLoading, input, handleFormSubmitCallback]); // 依存関係を更新

  // clearMessages を useCallback でメモ化 (親コンポーネントでのメモ化も推奨)
  const clearMessagesCallback = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  // 新しいメッセージが追加されたときに一番下にスクロールさせる
  useEffect(() => {
    if (virtuosoRef.current) {
        // followOutput="smooth"があるので基本不要だが、念のため
      virtuosoRef.current.scrollToIndex({ index: messages.length - 1, align: 'end', behavior: 'smooth' });
    }
  }, [messages]);

  // 応答完了時に自動的にスクロールする処理を追加
  useEffect(() => {
    // ローディング状態が変わるたびに実行
    if (!isLoading && messages.length > 0) {
      // 少し遅延させてスクロール（レンダリング完了を待つ）
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          behavior: 'smooth',
        });
      }, 50);
    }
  }, [isLoading, messages]);

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
            onClick={clearMessagesCallback}
            disabled={isLoading || messages.length === 0}
            className={`text-xs px-2 py-1 ${isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-200'}`}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            クリア
          </Button>
        </div>
      </div>
      {/* ScrollArea の代わりに Virtuoso を直接配置 */}
      {/* <ScrollArea className="flex-1 p-4"> */}
      <div className="flex-1 p-4 overflow-y-auto"> {/* Virtuosoのために高さを確保し、念のためoverflowを追加 */} 
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          handleInsertToEditor={handleInsertToEditorCallback}
          virtuosoRef={virtuosoRef} // Ref を渡す
        />
      </div>
      {/* </ScrollArea> */}

      <form onSubmit={handleFormSubmitCallback} className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-[#2c2c2c]' : 'border-gray-200 bg-gray-100'}`}>
        <div className="flex items-start gap-2">
          <TextareaAutosize
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDownCallback}
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
}); 