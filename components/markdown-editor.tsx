"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
  const editorRef = useRef<any>(null)
  const viewRef = useRef<EditorView | null>(null)
  const cursorPosRef = useRef<number>(0)
  const [isSaving, setIsSaving] = useState(false)

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
      cursorPosRef.current = pos;
      console.log("カーソル位置を更新:", pos);
    }
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    console.log("絵文字を挿入:", emoji);
    
    try {
      // 1. viewRefを経由した挿入を試みる
      if (viewRef.current) {
        // @ts-ignore - TypeScriptエラーを無視
        viewRef.current.dispatch({
          changes: {
            from: cursorPosRef.current,
            to: cursorPosRef.current,
            insert: emoji
          }
        });
        return;
      }
      
      // 2. エディタのコンテンツエリアを探して挿入を試みる
      const contentArea = document.querySelector('.cm-content');
      if (contentArea && contentArea.isContentEditable) {
        // contentEditableな要素に絵文字を挿入
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(emoji));
          selection.collapseToEnd();
          
          // エディタの内容を取得して状態を更新
          if (contentArea.textContent !== null) {
            setMarkdownContent(contentArea.textContent);
          }
          return;
        }
      }
      
      // 3. DOMからエディタビューを取得する方法
      const editorElement = document.querySelector('.cm-editor');
      if (editorElement) {
        // @ts-ignore - CodeMirror内部実装にアクセス
        if (editorElement['__view']) {
          // @ts-ignore
          const view = editorElement['__view'];
          // @ts-ignore
          const pos = view.state.selection.main.head || cursorPosRef.current;
          // @ts-ignore
          view.dispatch({
            changes: { from: pos, to: pos, insert: emoji }
          });
          return;
        }
      }
      
      // 4. 最終手段: カーソル位置をトラッキングして直接テキストを更新
      setMarkdownContent(prev => {
        const pos = cursorPosRef.current;
        if (pos >= 0 && pos <= prev.length) {
          return prev.substring(0, pos) + emoji + prev.substring(pos);
        }
        return prev + emoji; // どうしてもダメな場合は最後に追加
      });
      
    } catch (error) {
      console.error("絵文字挿入エラー:", error);
      // フォールバック: テキストの最後に追加
      setMarkdownContent(prev => prev + emoji);
    }
  }, [cursorPosRef.current]);

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
    const currentPreviewContent = 
      document.querySelector('.tabs-content[data-state="active"] .prose')?.innerHTML || 
      splitPreviewRef.current?.innerHTML ||
      tabPreviewRef.current?.innerHTML ||
      ""

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
            background-color: #1E1E1E;
            border-radius: 3px;
            padding: 16px;
            overflow: auto;
            color: #D4D4D4;
          }
          code {
            font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
          }
          /* VS Code-like syntax highlighting */
          .token.comment { color: #6A9955; }
          .token.string { color: #CE9178; }
          .token.keyword { color: #569CD6; }
          .token.function { color: #DCDCAA; }
          .token.number { color: #B5CEA8; }
          .token.operator { color: #D4D4D4; }
          .token.class-name { color: #4EC9B0; }
          /* Other styles remain the same */
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px 12px;
            text-align: left;
          }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin-left: 0;
            color: #666;
          }
          img {
            max-width: 100%;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
          }
          h1 {
            font-size: 2em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
          }
          h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #eaecef;
            padding-bottom: 0.3em;
          }
          h3 {
            font-size: 1.25em;
          }
          ul, ol {
            padding-left: 2em;
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
          .task-list-item {
            list-style-type: none;
          }
          .task-list-item input {
            margin: 0 0.2em 0.25em -1.6em;
            vertical-align: middle;
          }
        </style>
      </head>
      <body>
        <div id="content">
          ${currentPreviewContent}
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `

    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <Tabs defaultValue="split" className="w-full flex flex-col gap-2 sm:gap-4">
      <div className="flex flex-wrap items-center justify-between">
        <TooltipProvider>
          <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>

          {/* Tabs and Actions */}
          <div className="flex items-center space-x-3">
            {/* Tab controls */}
            <TabsList className="bg-gray-50 dark:bg-gray-800 h-8">
              <TabsTrigger value="split" className="px-2 text-xs">Split</TabsTrigger>
              <TabsTrigger value="edit" className="px-2 text-xs">Edit</TabsTrigger>
              <TabsTrigger value="preview" className="px-2 text-xs">Preview</TabsTrigger>
            </TabsList>

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

      <TabsContent value="split" className="mt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <ContextMenu>
                <ContextMenuTrigger 
                  onContextMenu={() => {
                    // 右クリック時にカーソル位置を保存
                    if (viewRef.current) {
                      handleCursorUpdate(viewRef.current);
                    }
                  }}
                >
                  <CodeMirror
                    value={markdownContent}
                    onChange={(value) => {
                      setMarkdownContent(value);
                      // テキストが変更された場合にカーソル位置を確認（オプション）
                      if (viewRef.current) {
                        handleCursorUpdate(viewRef.current);
                      }
                    }}
                    height="calc(100vh - 230px)"
                    extensions={[
                      markdown({ base: markdownLanguage, codeLanguages: languages }), 
                      EditorView.lineWrapping,
                      EditorView.updateListener.of(update => {
                        // カーソル位置やセレクションが変更されたとき
                        if (update.selectionSet) {
                          handleCursorUpdate(update.view);
                        }
                      })
                    ]}
                    theme={isDarkMode ? vscodeDark : xcodeLight}
                    className="border-none"
                    onCreateEditor={(editor) => {
                      console.log("エディタが作成されました");
                      editorRef.current = editor;
                      
                      // エディタビューを取得して保存
                      if (editor && editor.view) {
                        console.log("エディタビューを取得しました");
                        viewRef.current = editor.view;
                        
                        // 初期カーソル位置をテキスト末尾に設定
                        cursorPosRef.current = markdownContent.length;
                      } else {
                        console.warn("エディタビューを取得できませんでした");
                        
                        // DOMを介してビューを探す（フォールバック）
                        setTimeout(() => {
                          const editorElement = document.querySelector('.cm-editor');
                          if (editorElement) {
                            try {
                              // @ts-ignore - CodeMirror内部実装
                              const view = editorElement['__view'];
                              if (view) {
                                console.log("DOMからエディタビューを取得しました");
                                viewRef.current = view;
                                
                                // 初期カーソル位置を更新
                                handleCursorUpdate(view);
                              }
                            } catch (error) {
                              console.error("DOMからのビュー取得エラー:", error);
                            }
                          }
                        }, 200);
                      }
                    }}
                  />
                </ContextMenuTrigger>
                <ContextMenuContent className="min-w-[300px]">
                  <EmojiPicker onEmojiSelect={insertEmoji} />
                </ContextMenuContent>
              </ContextMenu>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <div ref={splitPreviewRef} className="prose prose-gray dark:prose-invert max-w-none h-[calc(100vh-230px)] overflow-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // @ts-ignore - ライブラリの型定義の問題を無視
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "")
                      return !inline && match ? (
                        // @ts-ignore - ライブラリの型定義の問題を無視
                        <SyntaxHighlighter
                          // @ts-ignore - ライブラリの型定義の問題を無視
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
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
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="edit" className="mt-0">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <ContextMenu>
              <ContextMenuTrigger 
                onContextMenu={() => {
                  // 右クリック時にカーソル位置を保存
                  handleCursorUpdate(viewRef.current)
                }}
              >
                <CodeMirror
                  value={markdownContent}
                  onChange={(value) => {
                    setMarkdownContent(value);
                    // テキストが変更された場合にカーソル位置を確認（オプション）
                    if (viewRef.current) {
                      handleCursorUpdate(viewRef.current);
                    }
                  }}
                  height="calc(100vh - 230px)"
                  extensions={[
                    markdown({ base: markdownLanguage, codeLanguages: languages }), 
                    EditorView.lineWrapping,
                    EditorView.updateListener.of(update => {
                      // カーソル位置やセレクションが変更されたとき
                      if (update.selectionSet) {
                        handleCursorUpdate(update.view);
                      }
                    })
                  ]}
                  theme={isDarkMode ? vscodeDark : xcodeLight}
                  className="border-none"
                  onCreateEditor={(editor) => {
                    editorRef.current = editor;
                    
                    // エディタビューを取得して保存
                    if (editor && editor.view) {
                      console.log("エディタビューを取得しました");
                      viewRef.current = editor.view;
                      
                      // 初期カーソル位置をテキスト末尾に設定
                      cursorPosRef.current = markdownContent.length;
                    } else {
                      console.warn("エディタビューを取得できませんでした");
                      
                      // DOMを介してビューを探す（フォールバック）
                      setTimeout(() => {
                        const editorElement = document.querySelector('.cm-editor');
                        if (editorElement) {
                          try {
                            // @ts-ignore - CodeMirror内部実装
                            const view = editorElement['__view'];
                            if (view) {
                              console.log("DOMからエディタビューを取得しました");
                              viewRef.current = view;
                              
                              // 初期カーソル位置を更新
                              handleCursorUpdate(view);
                            }
                          } catch (error) {
                            console.error("DOMからのビュー取得エラー:", error);
                          }
                        }
                      }, 200);
                    }
                  }}
                />
              </ContextMenuTrigger>
              <ContextMenuContent className="min-w-[300px]">
                <EmojiPicker onEmojiSelect={insertEmoji} />
              </ContextMenuContent>
            </ContextMenu>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preview" className="mt-0">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <div ref={tabPreviewRef} className="prose prose-gray dark:prose-invert max-w-none h-[calc(100vh-230px)] overflow-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // @ts-ignore - ライブラリの型定義の問題を無視
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "")
                    return !inline && match ? (
                      // @ts-ignore - ライブラリの型定義の問題を無視
                      <SyntaxHighlighter
                        // @ts-ignore - ライブラリの型定義の問題を無視
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
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
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

