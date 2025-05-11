"use client"

import React, { useEffect, useCallback, useState, useRef } from 'react'
import { Send, Trash2, BrainCircuit, Mic, MicOff, Plus, ArrowUp, Paperclip, ChevronDown, ChevronUp } from 'lucide-react'
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
import ReactMarkdown, { Components } from 'react-markdown'
// --- Temporarily treat remove-markdown as any due to missing types ---
// import removeMarkdown from 'remove-markdown' // Keep for TTS preparation if needed later
const removeMarkdown: any = require('remove-markdown'); 
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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
  setInput?: (value: string | ((prevInput: string) => string)) => void;
  append?: (message: CreateMessage, options?: { body?: Record<string, any> }) => Promise<string | null | undefined>;
  onInsertToEditor?: (text: string) => void;
  getEditorContent?: () => string;
  isDarkMode?: boolean;
}

// ファイルアップロード用の型定義
interface UploadedFile {
  name: string;
  type: string;
  size: number;
  data: string; // Base64エンコード
}

// SpeechRecognition用のインターフェース定義
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: (event: Event) => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Window インターフェースを拡張
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// MessageItem コンポーネントを修正して Markdown パーサーを使用 (デザイン変更適用)
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
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

    const markdownComponents: Components = React.useMemo(() => ({
      pre: ({ node, ...props }: any) => (
        <div className="my-0 rounded overflow-hidden">
          <pre
            className={`p-1 overflow-auto ${isDarkMode ? 'bg-[#0d1117] text-[#e6edf3]' : 'bg-gray-100 text-gray-800'}`}
            suppressHydrationWarning
            {...props}
          />
        </div>
      ),
      code: ({ node, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        return (
          <>
            {match ? (
              <div>
                <div
                  className={`px-1 py-0 text-[10px] ${isDarkMode ? 'bg-[#161b22] text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                  suppressHydrationWarning
                >
                  {match[1]}
                </div>
                <code
                  className={className}
                  suppressHydrationWarning
                  {...props}
                >
                  {children}
                </code>
              </div>
            ) : (
              <code
                className={`px-0.5 rounded ${isDarkMode ? 'bg-[#161b22] text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                suppressHydrationWarning
                {...props}
              >
                {children}
              </code>
            )}
          </>
        );
      },
      a: ({ node, ...props }: any) => (
        <a
          className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} hover:underline break-words font-medium`}
          target="_blank"
          rel="noopener noreferrer"
          suppressHydrationWarning
          {...props}
        />
      ),
      p: ({ node, ...props }: any) => (
        <p
          className="my-0 break-words leading-tight"
          suppressHydrationWarning
          {...props}
        />
      ),
      ul: ({ node, ...props }: any) => (
        <ul
          className="list-disc pl-3 my-0"
          suppressHydrationWarning
          {...props}
        />
      ),
      ol: ({ node, ...props }: any) => (
        <ol
          className="list-decimal pl-3 my-0"
          suppressHydrationWarning
          {...props}
        />
      ),
      li: ({ node, ...props }: any) => (
        <li
          className="my-0 py-0 break-words [&>p]:my-0"
          suppressHydrationWarning
          {...props}
        />
      ),
      h1: ({ node, ...props }: any) => (
        <h1
          className="text-sm font-bold mt-0.5 mb-0 break-words"
          suppressHydrationWarning
          {...props}
        />
      ),
      h2: ({ node, ...props }: any) => (
        <h2
          className="text-xs font-bold mt-0.5 mb-0 break-words"
          suppressHydrationWarning
          {...props}
        />
      ),
      h3: ({ node, ...props }: any) => (
        <h3
          className="text-xs font-semibold mt-0.5 mb-0 break-words"
          suppressHydrationWarning
          {...props}
        />
      ),
      blockquote: ({ node, ...props }: any) => (
        <blockquote
          className={`pl-1 border-l ${isDarkMode ? 'border-gray-600 bg-[#161b22]' : 'border-gray-300 bg-gray-50'} my-0`}
          suppressHydrationWarning
          {...props}
        />
      ),
      table: ({ node, ...props }: any) => (
        <div className="overflow-x-auto my-0">
          <table
            className={`min-w-full border-collapse text-[10px] ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
            suppressHydrationWarning
            {...props}
          />
        </div>
      ),
      th: ({ node, ...props }: any) => (
        <th
          className={`px-1 py-0 ${isDarkMode ? 'bg-[#21262d] border-gray-700' : 'bg-gray-100 border-gray-300'} border`}
          suppressHydrationWarning
          {...props}
        />
      ),
      td: ({ node, ...props }: any) => (
        <td
          className={`px-1 py-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} border break-words`}
          suppressHydrationWarning
          {...props}
        />
      ),
      hr: ({ node, ...props }: any) => (
        <hr
          className="my-0 border-t"
          suppressHydrationWarning
          {...props}
        />
      ),
    }), [isDarkMode]);

    // メッセージの内容をテキストに変換する関数
    const getMessageContent = React.useCallback((content: any): string => {
      // コンテンツがない場合は空文字を返す
      if (!content) return '';
      
      // 文字列の場合はそのまま返す
      if (typeof content === 'string') return content;
      
      // 配列の場合は各要素を処理
      if (Array.isArray(content)) {
        return content.map(item => {
          // テキスト部分を抽出
          if (item.type === 'text' && typeof item.text === 'string') {
            return item.text;
          }
          // ファイル部分の場合はファイル情報を表示
          if (item.type === 'file') {
            // file.nameがある場合はそれを使用、ない場合はitem.nameを試す
            let fileName = '';
            if ('file' in item && item.file && item.file.name) {
              fileName = item.file.name;
            } else if (item.name) {
              fileName = item.name;
            } else {
              fileName = '添付ファイル';
            }
            return `【ファイル: ${fileName}】`;
          }
          return '';
        }).join('\n');
      }
      
      // その他の場合はJSONに変換（フォールバック）
      try {
        return JSON.stringify(content);
      } catch (e) {
        return '[表示できないコンテンツ]';
      }
    }, []);

    // メッセージの長さをチェック
    const isLongMessage = React.useCallback((content: string): boolean => {
      const lines = content.split('\n');
      return lines.length > 15 || content.length > 1000;
    }, []);

    const messageContent = React.useMemo(() => getMessageContent(message.content), [message.content, getMessageContent]);
    const shouldUseAccordion = React.useMemo(() => message.role === 'assistant' && isLongMessage(messageContent), [message.role, messageContent, isLongMessage]);

    // プレビュー用のコンテンツを生成（最初の数行を表示）
    const previewContent = React.useMemo(() => {
      if (!shouldUseAccordion) return '';
      
      const lines = messageContent.split('\n');
      const previewLines = lines.slice(0, 8); // 最初の8行を表示
      let preview = previewLines.join('\n');
      
      // プレビューが途中で切れる場合は「...」を追加
      if (lines.length > 8) {
        preview += '\n\n...';
      }
      
      return preview;
    }, [messageContent, shouldUseAccordion]);

    const renderMarkdown = React.useCallback((content: string) => (
      <ReactMarkdown
        className="markdown-content leading-none"
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    ), [markdownComponents]);

    const RenderedContent = React.useMemo(() => {      
      return (
        <div className="whitespace-pre-wrap text-xs leading-relaxed">
          {message.role === 'user' ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{messageContent}</div>
          ) : (
            renderMarkdown(messageContent)
          )}
        </div>
      );
    }, [message.role, messageContent, renderMarkdown]);

    const PreviewContent = React.useMemo(() => {
      if (!shouldUseAccordion) return null;
      
      return (
        <div className="whitespace-pre-wrap text-xs leading-relaxed">
          {message.role === 'user' ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{previewContent}</div>
          ) : (
            renderMarkdown(previewContent)
          )}
        </div>
      );
    }, [shouldUseAccordion, message.role, previewContent, renderMarkdown]);

    // エディタに挿入するボタン
    const InsertToEditorButton = React.useMemo(() => (
      message.role === 'assistant' && !isLoading && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleInsertToEditor(typeof message.content === 'string' ? message.content : getMessageContent(message.content))}
          className={`mt-1 text-[10px] px-1 py-0.5 h-auto leading-none ${isDarkMode ? 'text-blue-400 hover:bg-[#30363d]' : 'text-blue-600 hover:bg-gray-100'}`}
          suppressHydrationWarning
        >
          エディタに挿入
        </Button>
      )
    ), [message.role, message.content, isLoading, handleInsertToEditor, getMessageContent, isDarkMode]);

    // アコーディオンを使用しない標準表示
    const StandardDisplay = React.useMemo(() => (
      <div>
        {RenderedContent}
        {InsertToEditorButton}
      </div>
    ), [RenderedContent, InsertToEditorButton]);

    // アコーディオンの状態を監視
    const handleAccordionValueChange = useCallback((value: string) => {
      setIsAccordionOpen(value === 'content');
    }, []);

    // カスタムアコーディオントリガー
    const CustomAccordionTrigger = React.forwardRef<
      HTMLButtonElement,
      React.ButtonHTMLAttributes<HTMLButtonElement> & { isOpen: boolean }
    >(({ className, children, isOpen, ...props }, ref) => (
      <button
        ref={ref}
        className={className}
        {...props}
      >
        <div className="flex items-center gap-1">
          {children}
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
    ));
    CustomAccordionTrigger.displayName = 'CustomAccordionTrigger';

    // アコーディオンを使用した折りたたみ表示
    const AccordionDisplay = React.useMemo(() => (
      <div>
        {!isAccordionOpen && PreviewContent}
        <div className={`flex justify-center items-center ${isDarkMode ? 'bg-[#21262d]' : 'bg-white'} rounded-sm mt-2 mb-1`}>
          <CustomAccordionTrigger 
            isOpen={isAccordionOpen}
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${
              isDarkMode 
                ? 'hover:bg-[#30363d] text-blue-400 hover:text-blue-300' 
                : 'hover:bg-gray-100 text-blue-600 hover:text-blue-500'
            }`}
          >
            {isAccordionOpen ? '折りたたむ' : '続きを読む'}
          </CustomAccordionTrigger>
        </div>
        {isAccordionOpen ? (
          <div className="pt-1 pb-0 overflow-hidden transition-all duration-300 ease-in-out animate-accordion-down">
            {RenderedContent}
            {InsertToEditorButton}
          </div>
        ) : null}
      </div>
    ), [PreviewContent, RenderedContent, InsertToEditorButton, isDarkMode, isAccordionOpen]);

    return (
      <div className="pb-3">
        <Card
          key={message.id}
          className={`
            max-w-[90%] rounded-lg shadow-sm
            ${message.role === 'user'
              ? isDarkMode
                ? 'bg-[#161b22] text-[#e6edf3] ml-auto'
                : 'bg-blue-50 ml-auto'
              : isDarkMode
                ? 'bg-[#21262d] text-[#e6edf3] mr-auto'
                : 'bg-white mr-auto'
            }
            ${isDarkMode ? 'border border-[#30363d]' : 'border border-gray-200'}
          `}
          suppressHydrationWarning
        >
          <CardContent className="p-1.5">
            {shouldUseAccordion ? AccordionDisplay : StandardDisplay}
          </CardContent>
        </Card>
      </div>
    );
});
MessageItem.displayName = 'MessageItem';

// Virtuoso を使用する新しいメッセージリストコンポーネント (デザイン変更適用)
const MessageList = React.memo(({
  messages,
  isLoading,
  isDarkMode,
  handleInsertToEditor,
  virtuosoRef,
}: {
  messages: Message[];
  isLoading: boolean;
  isDarkMode: boolean;
  handleInsertToEditor: (text: string) => void;
  virtuosoRef: React.RefObject<VirtuosoHandle>;
}) => {
  console.log('Rendering MessageList (Virtuoso)');

  const renderLoader = () => {
    if (isLoading && (!messages.length || messages[messages.length - 1]?.role === 'user')) {
        return (
            <div className="p-4 flex justify-center">
                <Card className={`max-w-[90%] mr-auto rounded-lg shadow-sm ${isDarkMode ? 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]' : 'bg-white border border-gray-200'}`} suppressHydrationWarning>
                    <CardContent className="p-3">
                        <p className="text-xs animate-pulse">回答を生成中...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    return null;
  };

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ flex: 1 }}
      data={messages}
      followOutput="smooth"
      itemContent={(index, message) => (
        <MessageItem
          message={message}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          handleInsertToEditor={handleInsertToEditor}
        />
      )}
      components={{ Footer: renderLoader }}
    />
  );
});
MessageList.displayName = 'MessageList';

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
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const latestInputRef = useRef<string>(input);
  const prevLoadingRef = useRef<boolean>(isLoading);
  
  // エラーメッセージ用のステート追加
  const [errorMessage, setErrorMessage] = useState<string>('');

  // エラーメッセージをチャットに追加する関数
  const addErrorMessageToChat = useCallback((errorText: string) => {
    if (!append) return;
    
    // エラーメッセージをアシスタントのメッセージとして追加
    append({
      role: 'assistant',
      content: `⚠️ **エラー**: ${errorText}\n\n`
    }, {});
    
    // エラーメッセージをクリア
    setErrorMessage('');
  }, [append]);

  // エラーメッセージが変更されたらチャットに追加
  useEffect(() => {
    if (errorMessage) {
      addErrorMessageToChat(errorMessage);
    }
  }, [errorMessage, addErrorMessageToChat]);

  // isLoading の変化を監視し、読み込み完了後に AI 応答がなかった場合にエラーを出す
  useEffect(() => {
    // ローディングが true -> false になった瞬間を検出
    if (prevLoadingRef.current && !isLoading) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'assistant') {
        console.warn('AI応答が生成されませんでした');
        setErrorMessage('AIからの応答がありませんでした。サーバー側でエラーが発生したか、タイムアウトした可能性があります。');
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, messages]);

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        setErrorMessage(''); // エラーメッセージをクリア
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
        setErrorMessage(`モデルリストの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    if (availableModels.length === 0) {
        fetchAvailableModels();
    }
  }, [availableModels, selectedModel]);

  const handleInsertToEditorCallback = useCallback((text: string) => {
    if (onInsertToEditor) {
      onInsertToEditor(text);
    }
  }, [onInsertToEditor]);

  const getEditorContentCallback = useCallback(() => {
      if (getEditorContent) {
          try {
              const content = getEditorContent();
              console.log('エディタ内容のチェック (コールバック経由):', content ? content.substring(0, 50) + '...' : 'エディタ内容が空です');
              return content ?? '';
          } catch (err) {
              console.error('getEditorContent関数エラー:', err);
              return '';
          }
      } else {
        console.warn('getEditorContent関数が提供されていません');
        return '';
      }
  }, [getEditorContent]);

  const handleFileClick = useCallback(() => {
    // すでにファイルがアップロードされている場合は処理を中止
    if (uploadedFiles.length > 0) {
      alert("すでにファイルがアップロードされています。一度に添付できるのは1ファイルのみです。");
      return;
    }
    
    // ファイル選択ダイアログを開く
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [uploadedFiles.length]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // すでにファイルがアップロードされている場合は処理を中止
    if (uploadedFiles.length > 0) {
      alert("すでにファイルがアップロードされています。一度に添付できるのは1ファイルのみです。");
      e.target.value = '';
      return;
    }
    
    // 最初のファイルだけを処理
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        // Base64形式に変換
        const base64Data = event.target.result.toString().split(',')[1];
        const fileInfo: UploadedFile = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64Data
        };
        setUploadedFiles([fileInfo]);
      }
    };
    reader.readAsDataURL(file);
    
    // 入力フィールドをリセット
    e.target.value = '';
  }, [uploadedFiles.length]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!append) {
      console.error("append関数が提供されていません。");
      setErrorMessage("メッセージを送信できません：チャット機能が正しく初期化されていません。");
      return;
    }
    if (!selectedModel) {
      console.error("送信するモデルが選択されていません。");
      setErrorMessage("使用するAIモデルを選択してください。");
      return;
    }

    setErrorMessage(''); // エラーメッセージをクリア
    console.log(`モデル '${selectedModel}' を使用してメッセージを送信します。`);

    try {
      let result: string | null | undefined;
      
      // アップロードされたファイルがある場合は、複合メッセージを作成
      if (uploadedFiles.length > 0) {
        // 複合メッセージ（テキスト + ファイル）を作成
        const messageParts = [];
        
        // テキストパートを追加
        if (content.trim()) {
          messageParts.push({
            type: 'text',
            text: content
          });
        }
        
        // ファイルパートを追加
        uploadedFiles.forEach(file => {
          messageParts.push({
            type: 'file',
            file: {
              type: 'file',
              data: file.data,
              mimeType: file.type,
              name: file.name
            }
          });
        });
        
        // console.log(`ファイル付きメッセージを送信します...`);
        result = await append(
          { 
            role: 'user',
            content: messageParts
          } as any,
          { body: { model: selectedModel } }
        );
      } else {
        // 通常のテキストメッセージ
        // console.log(`テキストメッセージを送信します...`);
        result = await append(
          { content, role: 'user' },
          { body: { model: selectedModel } }
        );
      }
      
      // // AIレスポンスの詳細解析
      console.log(`AIレスポンス解析:`, {
        型: typeof result,
        値: result,
        状態: result ? '成功' : '応答なし',
        メッセージID: result || '生成されず'
      });
      
      // ストリーミングレスポンスの場合、resultの値はnullでも問題ない
      // エラーチェックを削除して、常に成功として扱う
      /* 以下のコードを削除
      if (result === null || result === undefined) {
        console.warn("AIからの応答がありませんでした");
        setErrorMessage("AIからの応答がありませんでした。サーバー側でエラーが発生したか、タイムアウトした可能性があります。");
        return;
      }
      */
      
      // console.log(`メッセージ送信完了。レスポンスID: ${result}`);
      
      // 入力とファイルをリセット
      if (setInput) {
        setInput('');
        latestInputRef.current = '';
      }
      setRecognizedText('');
      setUploadedFiles([]);
    } catch (error) {
      console.error("メッセージ送信エラー:", error);
      // エラーの詳細情報をログに記録
      console.error("エラーの詳細:", {
        名前: error instanceof Error ? error.name : 'Unknown',
        メッセージ: error instanceof Error ? error.message : String(error),
        スタック: error instanceof Error ? error.stack : undefined
      });
      setErrorMessage(`メッセージの送信中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    }

  }, [append, selectedModel, setInput, uploadedFiles]);

  const handleFormSubmitCallback = useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    const contentToUse = latestInputRef.current || input;
    const trimmedInput = contentToUse.trim();
    // ファイルがアップロードされている場合は、テキストが空でも送信可能に
    if (!trimmedInput && uploadedFiles.length === 0) return;

    if (trimmedInput === 'クリア' && uploadedFiles.length === 0) {
      console.log('入力が "クリア" のため、メッセージをクリアします。');
      clearMessages();
      if (setInput) {
        setInput('');
        latestInputRef.current = '';
      }
      setRecognizedText('');
      return;
    }

    let contentToSend = trimmedInput;

    if (trimmedInput.includes('@editor')) {
        const editorContent = getEditorContentCallback();
        contentToSend = trimmedInput.replace('@editor', `\n\n### エディタ内容:\n\`\`\`\n${editorContent}\n\`\`\`\n`);
        console.log('エディタ内容を含む送信コンテンツ:', contentToSend.substring(0, 100) + '...');
    }

    await sendMessage(contentToSend);

  }, [input, getEditorContentCallback, sendMessage, clearMessages, setInput, uploadedFiles.length]);

  const handleKeyDownCallback = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && ((latestInputRef.current || input).trim() || uploadedFiles.length > 0)) {
        handleFormSubmitCallback();
      }
    }
  }, [isLoading, input, handleFormSubmitCallback, uploadedFiles.length]);

  const clearMessagesCallback = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        console.log('音声認識を停止します');
        recognitionRef.current.onend = () => {};
        recognitionRef.current.onerror = () => {};
        recognitionRef.current.stop();
      } catch (error) {
        console.error('音声認識停止エラー:', error);
      } finally {
        recognitionRef.current = null;
        setIsListening(false);
        setRecognizedText('');
      }
    }
  }, []);

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("お使いのブラウザは音声認識をサポートしていません。");
      return;
    }

    if (recognitionRef.current || isListening) {
      console.log('音声認識はすでに実行中です。');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';

      recognition.onstart = () => {
        setIsListening(true);
        setRecognizedText("");
        console.log('音声認識開始');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setRecognizedText(interimTranscript || finalTranscript);

        if (finalTranscript) {
          if (setInput) {
            const trimmedFinal = finalTranscript.trim();
            console.log('確定音声:', trimmedFinal);
            const currentVal = latestInputRef.current || input;
            const newVal = currentVal + (currentVal.length > 0 && !currentVal.endsWith(' ') ? ' ' : '') + trimmedFinal;
            setInput(newVal);
            latestInputRef.current = newVal;
          }
          setRecognizedText("");
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('音声認識エラー:', event.error);
        if (event.error !== 'no-speech') {
           alert(`音声認識エラー: ${event.error}`);
        }
        stopRecognition();
      };

      recognition.onend = () => {
        console.log('音声認識終了 (onend)');
        if (recognitionRef.current) {
            recognitionRef.current = null;
            setIsListening(false);
            setRecognizedText('');
        }
      };

      recognition.start();

    } catch (error) {
      console.error('音声認識の初期化エラー:', error);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current = null;
      }
    }
  }, [setInput, stopRecognition, input]);

  const toggleSpeechRecognition = useCallback(() => {
    if (isListening) {
      stopRecognition();
    } else {
      startSpeechRecognition();
    }
  }, [isListening, startSpeechRecognition, stopRecognition]);

  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, [stopRecognition]);

  return (
    <div 
      className={`flex flex-col h-full ${isDarkMode ? 'dark:bg-[#1E1E1EFF] text-[#e6edf3]' : 'bg-gray-100 text-gray-900'}`}
      suppressHydrationWarning
    >
      <div 
        className={`flex justify-between items-center px-4 py-0.5 ${isDarkMode ? 'border-b border-[#30363d]' : 'border-b border-gray-200'}`}
        suppressHydrationWarning
      >
        <h3 className="text-base font-semibold flex items-center">
          <BrainCircuit className="mr-2 h-5 w-5" />
          AI Assistant
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessagesCallback}
            disabled={isLoading || messages.length === 0}
            className={`text-xs px-2 py-1 ${isDarkMode ? 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]' : 'text-gray-600 hover:bg-gray-200'}`}
            suppressHydrationWarning
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-grow h-[calc(100%-4rem)] p-4 overflow-y-auto custom-scrollbar">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          handleInsertToEditor={handleInsertToEditorCallback}
          virtuosoRef={virtuosoRef}
        />
      </div>

      {/* ファイルアップロード表示エリア */}
      {uploadedFiles.length > 0 && (
        <div className={`px-4 py-2 ${isDarkMode ? 'bg-[#21262d] border-t border-[#30363d]' : 'bg-gray-50 border-t border-gray-200'}`}>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  isDarkMode ? 'bg-[#30363d] text-[#e6edf3]' : 'bg-blue-100 text-blue-800'
                }`}
              >
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-1 text-xs hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form 
        onSubmit={handleFormSubmitCallback} 
        className={`px-4 py-2 ${isDarkMode ? 'bg-[#1E1E1EFF]' : 'bg-gray-100'}`}
        suppressHydrationWarning
      >
        <div className="flex items-center gap-2 relative">
          <div className={`flex-1 relative flex items-center rounded-md border ${isDarkMode ? 'bg-[#1E1E1EFF] border-[#30363d]' : 'bg-white border-gray-300'}`}>
            {availableModels.length > 0 && (
              <div className="pl-2">
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    className={`h-7 text-xs pr-2 pl-1 border-0 ${isDarkMode ? 'bg-transparent text-[#8b949e]' : 'bg-transparent text-gray-500'} focus:ring-0 focus:ring-offset-0`}
                    suppressHydrationWarning
                  >
                    <SelectValue className="text-xs" placeholder="モデルを選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="text-xs">
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={`h-5 w-px mx-1 ${isDarkMode ? 'bg-[#30363d]' : 'bg-gray-300'}`}></div>

            <TextareaAutosize
              value={recognizedText ? `${latestInputRef.current}${latestInputRef.current && !latestInputRef.current.endsWith(' ') ? ' ' : ''}${recognizedText}` : input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDownCallback}
              placeholder="AIに質問する... (@editorでエディタの内容を参照、Shift+Enterで改行)"
              className={`flex-1 text-sm resize-none px-2 py-1.5 rounded-md ${isDarkMode ? 'bg-[#1E1E1EFF] text-[#e6edf3] placeholder-[#8b949e]' : 'bg-white text-gray-900 placeholder-gray-500'} focus:outline-none overflow-hidden`}
              disabled={isLoading || availableModels.length === 0}
              minRows={1}
              maxRows={12}
              suppressHydrationWarning
            />

            <div className="flex items-center pr-2 gap-1">
              {/* ファイルアップロードボタン */}
              <button
                type="button"
                onClick={handleFileClick}
                className={`p-1 rounded hover:bg-opacity-20 ${
                  isDarkMode ? 'text-gray-400 hover:bg-[#21262d]' : 'text-gray-600 hover:bg-gray-200'
                } cursor-pointer`}
                disabled={isLoading}
                suppressHydrationWarning
              >
                <Paperclip size={16} />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                // accept="application/pdf,.pdf"
              />

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-1 rounded hover:bg-opacity-20 ${
                  isListening
                    ? 'text-red-500'
                    : isDarkMode ? 'text-gray-400 hover:bg-[#21262d]' : 'text-gray-600 hover:bg-gray-200'
                } cursor-pointer`}
                disabled={false}
                suppressHydrationWarning
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && uploadedFiles.length === 0) || availableModels.length === 0 || !selectedModel}
                className={`p-1 rounded-md ${
                  isDarkMode
                    ? 'text-blue-400 hover:bg-[#21262d] hover:bg-opacity-20 disabled:text-gray-600'
                    : 'text-blue-600 hover:bg-gray-200 disabled:text-gray-400'
                } ${(isLoading || (!input.trim() && uploadedFiles.length === 0) || availableModels.length === 0 || !selectedModel) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                suppressHydrationWarning
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.2) transparent' : 'rgba(0, 0, 0, 0.2) transparent'};
        }
      `}} />
    </div>
  )
});
AIChat.displayName = 'AIChat'; 