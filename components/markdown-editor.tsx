"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Save,
  Printer,
  Heading1,
  Heading2,
  Heading3,
  Table,
  CheckSquare,
  Moon,
  Sun,
  Smile,
  Box,
  MessageSquare,
  SplitSquareVertical,
  Trash2
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import CodeMirror from "@uiw/react-codemirror"
import { markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { xcodeLight } from "@uiw/codemirror-theme-xcode"
import { EditorView } from "@codemirror/view"
import { markdown } from "@codemirror/lang-markdown"
import { EmojiPicker } from "./emoji-picker"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu"
import MermaidDiagram from "./mermaid-diagram"
import { AIChat } from "./ai-chat"
import { TripleLayout } from "./triple-layout"
import { useChat } from 'ai/react'

// File System Access API の型定義
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (content: string) => Promise<void>;
        close: () => Promise<void>;
      }>
    }>;
  }
}

export default function MarkdownEditor() {
  const [markdownContent, setMarkdownContent] = useState("# Hello, World!\n\nStart typing your markdown here...")
  const previewRef = useRef<HTMLDivElement>(null)
  const splitPreviewRef = useRef<HTMLDivElement>(null)
  const tabPreviewRef = useRef<HTMLDivElement>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const editorRef = useRef<EditorView | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const cursorPosRef = useRef<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split' | 'triple'>('split')

  // useChatフックをMarkdownEditorに移動
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat();

  // チャットクリア関数
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const insertText = (before: string, after = "") => {
    // For CodeMirror, we'll need to use the editor's API
    // This is a simplified approach - in a real app, you might want to use a ref
    const selection = window.getSelection?.()?.toString() || ""
    const newText = before + selection + after

    // Insert at cursor position or replace selection
    setMarkdownContent((prev) => {
      if (selection) {
        const selectionStart = prev.indexOf(selection)
        if (selectionStart !== -1) {
          return prev.substring(0, selectionStart) + newText + prev.substring(selectionStart + selection.length)
        }
      }
      // If no selection or selection not found, append to end
      return prev + newText
    })
  }

  // マウントされた際にエディタにフォーカスを当てる
  useEffect(() => {
    // 初期カーソル位置を設定
    cursorPosRef.current = markdownContent.length;
    
    // フォーカスを当てる（オプション）
    const timeoutId = setTimeout(() => {
      if (viewRef.current) {
        viewRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // カーソル位置の更新を処理する関数
  const handleCursorUpdate = useCallback((view: EditorView | null) => {
    if (view) {
      const pos = view.state.selection.main.head;
      // viewRefがnullの場合や、posが以前と同じ場合は更新しない
      // (不要な再レンダリングや無限ループを防ぐため)
      if (cursorPosRef.current !== pos) {
          cursorPosRef.current = pos;
          console.log("カーソル位置を更新:", pos);
      }
    }
  }, []); // 依存配列は空のままで良い

  const insertEmoji = useCallback((emoji: string) => {
    console.log("絵文字を挿入:", emoji);

    try {
      // 1. viewRefを経由した挿入を試みる
      if (viewRef.current) {
        const currentPos = viewRef.current.state.selection.main.head; // 現在のカーソル位置
        // @ts-ignore - TypeScriptエラーを無視 (必要であれば型アサーションを検討)
        viewRef.current.dispatch({
          changes: {
            from: currentPos,
            to: currentPos,
            insert: emoji
          },
          selection: { anchor: currentPos + emoji.length } // 挿入後にカーソル移動
        });
        viewRef.current.focus(); // エディタにフォーカスを戻す
        // cursorPosRefはupdateListenerで更新されるはずだが、念のため
        cursorPosRef.current = currentPos + emoji.length;
        console.log("絵文字挿入 (CodeMirror):", emoji, " 新カーソル位置:", cursorPosRef.current);
        return;
      }

      // 2. エディタのコンテンツエリアを探して挿入を試みる (削除)
      /*
      const contentArea = document.querySelector('.cm-content');
      ...
      */

      // 3. DOMからエディタビューを取得する方法 (削除)
      /*
      const editorElement = document.querySelector('.cm-editor');
      ...
      */

      // 4. フォールバック: カーソル位置をトラッキングして直接テキストを更新
      console.warn("viewRef.current is not available for emoji insertion. Falling back.");
      setMarkdownContent(prev => {
        const pos = cursorPosRef.current;
        // カーソル位置が有効範囲内か確認
        const safePos = Math.max(0, Math.min(pos, prev.length));
        const newContent = prev.substring(0, safePos) + emoji + prev.substring(safePos);
        // カーソル位置を更新
        cursorPosRef.current = safePos + emoji.length;
        console.log("絵文字挿入 (Fallback):", emoji, " 新カーソル位置:", cursorPosRef.current);
        return newContent;
      });

    } catch (error) {
      console.error("絵文字挿入エラー:", error);
      // フォールバック: テキストの最後に追加
      setMarkdownContent(prev => {
         const newContent = prev + emoji;
         cursorPosRef.current = newContent.length;
         return newContent;
      });
    }
  // 依存配列に cursorPosRef.current を含めない
  }, [setMarkdownContent]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // window.showDirectoryPickerがサポートされている場合のみ実行
      if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker === 'function') {
        // ファイル保存ダイアログを表示
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'document.md',
          types: [{
            description: 'Markdown',
            accept: {
              'text/markdown': ['.md'],
            },
          }],
        });
        
        // ファイルに書き込むためのWritableStreamを取得
        const writable = await fileHandle.createWritable();
        
        // ファイルにマークダウンコンテンツを書き込み
        await writable.write(markdownContent);
        
        // ストリームを閉じて保存を完了
        await writable.close();
        
        console.log("ファイルが保存されました");
      } else {
        // 従来の方法にフォールバック
        const blob = new Blob([markdownContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "document.md";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log("従来の方法でファイルがダウンロードされました");
      }
    } catch (error) {
      console.error("ファイル保存エラー:", error);
      
      // エラーの場合は従来の方法にフォールバック
      const blob = new Blob([markdownContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsSaving(false);
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    // 表示中のプレビュー要素を取得
    // MermaidがレンダリングしたSVGを含む可能性のある要素を優先的に試す
    const activePreviewElement =
      document.querySelector('.tabs-content[data-state="active"] .prose') ||
      splitPreviewRef.current || // Split view のプレビュー
      tabPreviewRef.current;     // Tab view のプレビュー

    // innerHTML を取得 (レンダリング済み SVG が含まれることを期待)
    const currentPreviewContent = activePreviewElement?.innerHTML || "";


    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Markdown Preview</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          pre {
            background-color: #1E1E1E; /* Use a specific background for code blocks */
            border-radius: 3px;
            padding: 16px;
            overflow: auto;
            color: #D4D4D4; /* Light text color for dark background */
          }
          /* Ensure code within pre also uses monospace font */
          pre code {
            font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
            background: none; /* Remove background from inline code inside pre */
            padding: 0; /* Remove padding from inline code inside pre */
            color: inherit; /* Inherit color from pre */
          }
          /* Style for inline code */
          code:not(pre > code) {
             font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
             background-color: rgba(27,31,35,.05); /* Subtle background for inline code */
             padding: .2em .4em;
             margin: 0;
             font-size: 85%;
             border-radius: 3px;
          }
          /* VS Code-like syntax highlighting (placeholder, actual highlighting depends on react-syntax-highlighter's output structure) */
          .token.comment { color: #6A9955; }
          .token.string { color: #CE9178; }
          .token.keyword { color: #569CD6; }
          .token.function { color: #DCDCAA; }
          .token.number { color: #B5CEA8; }
          .token.operator { color: #D4D4D4; }
          .token.class-name { color: #4EC9B0; }
          /* Table styles */
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
            border-spacing: 0;
          }
          table th, table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          table tr:nth-child(even) {
            background-color: #f6f8fa; /* Zebra striping for table rows */
          }
          blockquote {
            border-left: 4px solid #dfe2e5; /* Adjusted color */
            padding: 0 1em; /* Adjusted padding */
            margin-left: 0;
            color: #6a737d; /* Adjusted color */
          }
          img {
            max-width: 100%;
            height: auto; /* Maintain aspect ratio */
            display: block; /* Prevent extra space below image */
          }
          /* Heading styles */
          h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
          }
          h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
          h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
          h3 { font-size: 1.25em; }
          h4 { font-size: 1em; }
          h5 { font-size: .875em; }
          h6 { font-size: .85em; color: #6a737d; }
          ul, ol {
            padding-left: 2em;
            margin-top: 0; /* Consistent list spacing */
            margin-bottom: 16px; /* Consistent list spacing */
          }
          hr {
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background-color: #e1e4e8;
            border: 0;
          }
          a {
            color: #0366d6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          /* Task list styles */
          .task-list-item {
            list-style-type: none;
          }
          .task-list-item label {
            font-weight: normal; /* Override potential bolding */
          }
          .task-list-item.enabled label {
             cursor: pointer;
          }
          .task-list-item + .task-list-item {
             margin-top: 3px;
          }
          .task-list-item input[type=checkbox] {
            margin: 0 0.2em 0.25em -1.6em;
            vertical-align: middle;
          }
          /* Mermaid図表のスタイル (SVGが直接埋め込まれることを想定) */
          .mermaid {
            text-align: center; /* Center the container */
            margin-bottom: 16px; /* Add space below diagram */
          }
          .mermaid svg {
            max-width: 100%; /* Ensure SVG scales down */
            height: auto !important; /* Maintain aspect ratio */
            display: block; /* Prevent extra space */
            margin: 0 auto; /* Center SVG within the container */
          }
          /* Add specific styles if MermaidDiagram component wraps SVG */
          .mermaid > svg { /* Target direct SVG child if applicable */
             /* Add styles here if needed */
          }
        </style>
      </head>
      <body>
        <div id="content">
          ${currentPreviewContent}
        </div>
        <script>
          // No need to run mermaid.initialize or mermaid.run here
          // as the content should already contain the rendered SVG.
          // Just trigger print once the content is loaded.
          window.onload = function() {
            console.log('Content loaded, triggering print...');
            window.print();
            // Optionally close the window after printing/cancellation
            // setTimeout(() => { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close() // close() is important for window.onload to fire
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  // エディタの内容をクリアする関数
  const handleClearContent = useCallback(() => {
    setMarkdownContent("");
    cursorPosRef.current = 0; // カーソル位置もリセット
  }, []);

  // マークダウンコンテンツが変更されたときの処理
  const handleContentChange = useCallback((value: string) => {
    setMarkdownContent(value)
  }, [])

  // AIからのコンテンツをエディタに挿入
  const handleAIContentInsert = useCallback((text: string) => {
    try {
      // 1. viewRefを経由した挿入を試みる
      if (viewRef.current) {
        const currentPos = viewRef.current.state.selection.main.head; // 現在のカーソル位置
        // @ts-ignore - TypeScriptエラーを無視 (必要であれば型アサーションを検討)
        viewRef.current.dispatch({
          changes: {
            from: currentPos,
            to: currentPos,
            insert: text
          },
          selection: { anchor: currentPos + text.length } // 挿入後にカーソル移動
        });
        viewRef.current.focus(); // エディタにフォーカスを戻す
        // cursorPosRefはupdateListenerで更新されるはずだが、念のため
        cursorPosRef.current = currentPos + text.length;
        console.log("AIコンテンツ挿入 (CodeMirror):", text, " 新カーソル位置:", cursorPosRef.current);
        return;
      }

      // 2. エディタのコンテンツエリアを探して挿入を試みる (削除)
      /*
      const contentArea = document.querySelector('.cm-content');
      ...
      */

      // 3. 最終手段: カーソル位置をトラッキングして直接テキストを更新 (フォールバック)
      console.warn("viewRef.current is not available. Falling back to direct state update.");
      setMarkdownContent(prev => {
        const pos = cursorPosRef.current; // 保存されているカーソル位置を使用
        // カーソル位置が有効範囲内か確認
        const safePos = Math.max(0, Math.min(pos, prev.length));
        const newContent = prev.substring(0, safePos) + text + prev.substring(safePos);
        // カーソル位置を更新
        cursorPosRef.current = safePos + text.length;
        console.log("AIコンテンツ挿入 (Fallback):", text, " 新カーソル位置:", cursorPosRef.current);
        return newContent;
      });

    } catch (error) {
      console.error("AIコンテンツ挿入エラー:", error);
      // フォールバック: テキストの最後に追加
      setMarkdownContent(prev => {
         const newContent = prev + text;
         cursorPosRef.current = newContent.length; // カーソル位置を最後に設定
         return newContent;
      });
    }
  // 依存配列に cursorPosRef.current を含めない
  }, [setMarkdownContent]);

  // EditorView.updateListenerを含む拡張機能
  const editorExtensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.selectionSet || update.docChanged) { // selectionSet または docChanged で発火
        // viewRef.currentがnullの場合や、ビューがフォーカスされていない場合は処理しない
        if (update.view.hasFocus) {
           handleCursorUpdate(update.view);
        } else {
           // フォーカスがない場合でも、外部からの変更などでカーソル位置が変わる可能性がある
           // 必要に応じて handleCursorUpdate を呼ぶか、Refを直接更新する
           // cursorPosRef.current = update.state.selection.main.head;
        }
      }
    })
  ], [handleCursorUpdate]); // handleCursorUpdate を依存配列に追加

  // エディタコンポーネント
  const EditorComponent = (
    <CodeMirror
      value={markdownContent}
      height="100%"
      extensions={editorExtensions} // 更新された拡張機能を使用
      onChange={handleContentChange}
      theme={isDarkMode ? vscodeDark : xcodeLight}
      className={`text-md ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}
      onCreateEditor={(view, state) => { // onCreateEditorを追加
        viewRef.current = view; // viewRefを設定
        console.log("CodeMirror editor instance created and viewRef set.");
        // 初期カーソル位置を設定・更新
        handleCursorUpdate(view);
      }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightSpecialChars: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
      }}
    />
  )

  // プレビューコンポーネント
  const PreviewComponent = (
    <div
      ref={splitPreviewRef}
      className={`prose prose-sm max-w-none h-full overflow-auto p-4 ${
        isDarkMode ? 'prose-invert bg-gray-900' : 'bg-white'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // @ts-ignore - ライブラリの型定義の問題を無視
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")

            // Mermaidダイアグラムの処理
            if (!inline && match && match[1] === 'mermaid') {
              const chartContent = String(children).replace(/\n$/, "").trim();
              if (!chartContent) {
                return (
                  <div className="p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded text-red-600 dark:text-red-400">
                    図のコードが空です
                  </div>
                );
              }
              // ここで MermaidDiagram コンポーネントを使う
              return (
                 <div className="mermaid"> {/* Ensure .mermaid class is present for handlePrint */}
                    <MermaidDiagram chart={chartContent} />
                 </div>
              )
            }

            return !inline && match ? (
              <div>
                {match[1] !== 'mermaid' && (
                  <div className={`code-language ${isDarkMode ? 'dark-language' : 'light-language'}`}>
                    {match[1]}
                  </div>
                )}
                <SyntaxHighlighter
                  // @ts-ignore - ライブラリの型定義の問題を無視
                  style={vscDarkPlus} // Use dark mode theme directly for now
                  language={match[1]}
                  PreTag="div"
                  customStyle={isDarkMode ? { 
                    backgroundColor: '#000000', 
                    border: 'none',
                    borderRadius: '6px',
                    padding: '1em',
                    margin: '1em 0'
                  } : {}}
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
  )

  return (
    <div className={`h-[calc(100vh-8rem)] ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
      <div className="bg-muted p-2 flex justify-between items-center mb-2 rounded-md">
        <TooltipProvider>
          <div className="flex space-x-1">
            {/* Headings */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("# ", "\n")}>
                    <Heading1 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 1</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("## ", "\n")}>
                    <Heading2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 2</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("### ", "\n")}>
                    <Heading3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading 3</TooltipContent>
              </Tooltip>
            </div>

            {/* Text formatting */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("**", "**")}>
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("*", "*")}>
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    // スマイルボタンをクリックしたときの挙動（オプション）
                    const dummyEvent = new MouseEvent('contextmenu', {
                      bubbles: true,
                      cancelable: true,
                      clientX: 100,
                      clientY: 100,
                    });
                    document.querySelector('.cm-content')?.dispatchEvent(dummyEvent);
                  }}>
                    <Smile className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>絵文字を挿入</TooltipContent>
              </Tooltip>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("- ", "\n")}>
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("1. ", "\n")}>
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Numbered List</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("- [ ] ", "\n")}>
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Task List</TooltipContent>
              </Tooltip>
            </div>

            {/* Block elements */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("> ", "\n")}>
                    <Quote className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quote</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("```\n", "\n```")}>
                    <Code className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Code Block</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("|  |  |\n|--|--|\n|  |  |\n")}>
                    <Table className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Table</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("```mermaid\ngraph TD\n  A[開始] --> B[処理]\n  B --> C[終了]\n```\n")}>
                    <Box className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mermaidダイアグラム</TooltipContent>
              </Tooltip>
            </div>

            {/* Links and images */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("[", "](url)")}>
                    <Link className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Link</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("![", "](url)")}>
                    <Image className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Image</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearContent}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>エディタの内容をクリア</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        <TooltipProvider>
          <div className="flex space-x-2">
            {/* ビューモード切り替えボタン */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'editor' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('editor')}
                  >
                    <Code size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>エディタのみ表示</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'preview' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('preview')}
                  >
                    <Box size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>プレビューのみ表示</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'split' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('split')}
                  >
                    <SplitSquareVertical size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>エディタとプレビューを分割表示</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'triple' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('triple')}
                  >
                    <MessageSquare size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AIチャット表示</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleSave} className="h-8 gap-1" disabled={isSaving}>
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">{isSaving ? "保存中..." : "Save"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Markdown</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1">
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Print</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print Preview</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={toggleDarkMode} className="h-8 gap-1">
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{isDarkMode ? "Light" : "Dark"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      <div className="h-[calc(100%-3rem)]">
        {viewMode === 'editor' && (
          <div className={`${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'} h-full`}>
            {EditorComponent}
          </div>
        )}
        
        {viewMode === 'preview' && (
          <div className={isDarkMode ? 'bg-gray-900 h-full' : 'bg-white h-full'}>
            {PreviewComponent}
          </div>
        )}
        
        {viewMode === 'split' && (
          <div className={`grid grid-cols-2 h-full gap-2 ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
            <div className={`${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
              {EditorComponent}
            </div>
            <div className={isDarkMode ? 'bg-gray-900' : 'bg-white'}>
              {PreviewComponent}
            </div>
          </div>
        )}
        
        {viewMode === 'triple' && (
          <TripleLayout
            editorComponent={EditorComponent}
            previewComponent={PreviewComponent}
            onAIContentInsert={handleAIContentInsert}
            isDarkMode={isDarkMode}
            messages={messages}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            clearMessages={clearMessages}
          />
        )}
      </div>
    </div>
  )
}

