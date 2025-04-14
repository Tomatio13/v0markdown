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
  Trash2,
  Terminal,
  Upload,
  Presentation,
  Columns,
  FileDown,
  FileCode
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
import { vim } from "@replit/codemirror-vim"
import { keymap } from "@codemirror/view"
import { EmojiPicker, EmojiContextMenu } from "./emoji-picker"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu"
import MermaidDiagram from "./mermaid-diagram"
import { AIChat } from "./ai-chat"
import { TripleLayout } from "./triple-layout"
import { useChat } from 'ai/react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { GoogleFile } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'
import { Switch } from "@/components/ui/switch"
import GoogleAuth from "./google-auth"
import GoogleDriveFileList from "./google-drive-file-list"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import MarpPreview from "./marp-preview"
import QuartoPreview from "./quarto-preview"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"

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
  const [isVimMode, setIsVimMode] = useState(false)
  const editorRef = useRef<EditorView | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const cursorPosRef = useRef<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split' | 'triple' | 'marp-preview' | 'marp-split' | 'quarto-preview' | 'quarto-split'>('split')

  // Google Drive連携関連の状態 (accessToken のみ保持)
  const [driveEnabled, setDriveEnabled] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null) // driveService の代わりに accessToken
  const [selectedFile, setSelectedFile] = useState<GoogleFile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false) // 認証状態は引き続き管理

  // useChatフック
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput, append, reload, stop } = useChat();

  // チャットクリア関数
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  // Google認証状態が変更されたときのハンドラ (accessToken をセット)
  const handleAuthChange = useCallback((authenticated: boolean, token?: string) => {
    setIsAuthenticated(authenticated)
    setAccessToken(token || null) // トークンを状態に保存
    if (!authenticated) {
      setSelectedFile(null) // ログアウト時に選択ファイルをクリア
    }
  }, [])

  // Google Drive連携の有効/無効を切り替えるハンドラ
  const handleDriveToggle = useCallback((enabled: boolean) => {
    setDriveEnabled(enabled)
    if (!enabled) {
      setSelectedFile(null)
    }
  }, [])

  // Google Driveからファイルを選択したときのハンドラ (API Route を fetch)
  const handleFileSelect = useCallback(async (file: GoogleFile) => {
    if (!accessToken) return

    try {
      const response = await fetch(`/api/drive/read?fileId=${file.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      // テキストコンテンツを取得
      const content = await response.text()

      setMarkdownContent(content)
      setSelectedFile(file)
    } catch (error: any) {
      console.error('ファイル読み込みエラー:', error)
      alert(error.message || 'ファイルを読み込めませんでした')
    } finally {
      // 必要であればローディング状態を解除
    }
  }, [accessToken])

  // Google Driveにファイルを保存するハンドラ (API Route を fetch)
  const handleDriveSave = useCallback(async () => {
    if (!accessToken) return

    setIsSaving(true)

    try {
      // 1. Markdownの最初の行を取得
      const firstLine = markdownContent.split('\n')[0] || '';
      // 2. 見出し記号を除去し、トリム
      let baseName = firstLine.replace(/^#+\s*/, '').trim();
      // 3. スペースを除去
      baseName = baseName.replace(/\s+/g, '');
      // 4. ファイル名に使えない文字を置換
      baseName = baseName.replace(/[\/]/g, '_'); 

      // 5. ファイル名が空でないか確認、空ならデフォルト名
      const potentialFileName = baseName ? `${baseName}.md` : '';

      // 選択中のファイル名、または生成したファイル名、またはデフォルト名を使用
      const fileName = selectedFile?.name || potentialFileName || `untitled-${uuidv4().substring(0, 8)}.md`;
      
      const method = selectedFile ? 'PUT' : 'POST' // 既存ファイルはPUT、新規はPOST

      const response = await fetch('/api/drive/save', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: fileName, // 生成したファイル名を使用
          content: markdownContent,
          fileId: selectedFile?.id // 更新時のみ fileId を送信
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const savedFileData = await response.json()
      console.log('Google Driveに保存しました:', savedFileData)

      // 選択ファイル情報を更新 (IDと更新日時を含む)
      setSelectedFile({
        id: savedFileData.id,
        name: savedFileData.name, // 保存された実際のファイル名で更新
        mimeType: 'text/markdown', // mimeType は固定
        modifiedTime: savedFileData.modifiedTime
        // createdTime は保存APIレスポンスに含まれていないため更新しない
      })

    } catch (error: any) {
      console.error('Google Drive保存エラー:', error)
      alert(error.message || 'Google Driveへの保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }, [accessToken, markdownContent, selectedFile])

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
      
      // Google Driveが有効で認証済みの場合はGoogle Driveに保存
      if (driveEnabled && isAuthenticated && accessToken) {
        await handleDriveSave();
        return;
      }
      
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

  // Vimモードの切り替え関数
  const toggleVimMode = () => {
    const currentCursorPos = cursorPosRef.current;
    setIsVimMode(!isVimMode);
    setTimeout(() => {
      if (viewRef.current) {
        // viewRef.current.contentDOM.focus(); // デバッグ中はフォーカス移動を一旦コメントアウト
        try {
          const state = viewRef.current.state;
          const transaction = state.update({
            selection: {anchor: currentCursorPos, head: currentCursorPos}
          });
          viewRef.current.dispatch(transaction);
          // モード切替後もデバッグ用枠線適用
          console.log("Toggling Vim mode, applying debug borders.");
          document.querySelectorAll('.cm-tooltip, .cm-panel, .cm-dialog, .cm-vimMode-command-dialog, .cm-search-panel')
            .forEach(el => {
               if (el instanceof HTMLElement) {
                  el.style.setProperty('border', '2px solid orange', 'important'); // Vim切替時はオレンジ枠
                  el.style.setProperty('visibility', 'visible', 'important');
                  el.style.setProperty('opacity', '0.7', 'important');
               }
            });
        } catch (error) {
          console.error("カーソル位置の復元に失敗:", error);
        }
      }
    }, 100);
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

  // PowerPointへの変換処理
  const [isPptxGenerating, setIsPptxGenerating] = useState(false)
  const [isQuartoPptxGenerating, setIsQuartoPptxGenerating] = useState(false)
  
  const handleExportToPptx = async () => {
    console.log('PowerPoint変換処理を開始します...');
    try {
      setIsPptxGenerating(true)
      
      // マークダウンコンテンツが空でないか確認
      if (!markdownContent.trim()) {
        console.error('マークダウンコンテンツが空です');
        alert('マークダウンコンテンツが空です。変換するコンテンツを入力してください。');
        return;
      }
      
      console.log(`マークダウンコンテンツ (${markdownContent.length}文字) をフォームデータに変換します...`);
      
      // マークダウンコンテンツをエンコード
      const formData = new FormData()
      formData.append('markdown', markdownContent)
      
      // APIエンドポイントを呼び出し
      console.log('APIエンドポイントを呼び出します...');
      const response = await fetch('/api/export-to-pptx', {
        method: 'POST',
        body: formData
      })
      
      console.log(`APIレスポンス: status=${response.status}, ok=${response.ok}`);
      
      // APIからのエラーレスポンスを処理
      if (!response.ok) {
        let errorMessage = 'PowerPoint変換エラー';
        try {
          // JSONエラーレスポンスを解析
          const errorData = await response.json();
          errorMessage = errorData.error || 'PowerPoint変換エラー';
          console.error('APIエラーレスポンス:', errorData);
        } catch (jsonError) {
          // JSONでない場合はテキストを取得
          const errorText = await response.text();
          errorMessage = errorText || 'PowerPoint変換エラー';
          console.error('APIエラーテキスト:', errorText);
        }
        throw new Error(errorMessage);
      }
      
      // Content-Typeを確認
      const contentType = response.headers.get('Content-Type');
      console.log(`レスポンスのContent-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        // JSONレスポンスの場合はエラーとして処理
        const jsonData = await response.json();
        console.error('JSONレスポンス (エラーの可能性):', jsonData);
        throw new Error(jsonData.error || 'PowerPoint変換エラー');
      }
      
      // 処理時間のデバッグ情報
      const processingTime = response.headers.get('X-Processing-Time');
      if (processingTime) {
        console.log(`サーバー処理時間: ${processingTime}`);
      }
      
      // BlobとしてPPTXファイルを取得
      console.log('レスポンスデータをBlobとして取得します...');
      const pptxBlob = await response.blob();
      console.log(`Blobサイズ: ${pptxBlob.size} バイト, タイプ: ${pptxBlob.type}`);
      
      // ファイルサイズの確認
      if (pptxBlob.size === 0) {
        throw new Error('生成されたPPTXファイルが空です');
      }
      
      // ファイル名を決定 - マークダウンの先頭行から決定
      let fileName = 'presentation.pptx'
      const firstLine = markdownContent.split('\n')[0] || ''
      const title = firstLine.replace(/^#+\s*/, '').trim()
      if (title) {
        fileName = `${title.replace(/\s+/g, '_').replace(/[\/\\?%*:|"<>]/g, '_')}.pptx`
      }
      console.log(`ファイル名: ${fileName}`);
      
      // ダウンロード
      console.log('ファイルをダウンロードします...');
      const url = URL.createObjectURL(pptxBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      
      // クリーンアップ
      setTimeout(() => {
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
        console.log('ダウンロードリンクのクリーンアップ完了');
      }, 100)
      
      console.log('PowerPointファイルが正常に生成されました')
    } catch (error) {
      console.error('PowerPoint変換エラー詳細:', error)
      alert(error instanceof Error ? error.message : '変換中に不明なエラーが発生しました')
    } finally {
      setIsPptxGenerating(false)
    }
  }

  // QuartoでのPPTX変換処理
  const handleExportToQuartoPptx = async () => {
    console.log('Quarto PowerPoint変換処理を開始します...');
    try {
      setIsQuartoPptxGenerating(true)
      
      // マークダウンコンテンツが空でないか確認
      if (!markdownContent.trim()) {
        console.error('マークダウンコンテンツが空です');
        alert('マークダウンコンテンツが空です。変換するコンテンツを入力してください。');
        return;
      }
      
      console.log(`マークダウンコンテンツ (${markdownContent.length}文字) をフォームデータに変換します...`);
      
      // マークダウンコンテンツをエンコード
      const formData = new FormData()
      formData.append('markdown', markdownContent)
      formData.append('format', 'pptx')
      
      // APIエンドポイントを呼び出し
      console.log('APIエンドポイントを呼び出します...');
      const response = await fetch('/api/export-to-quarto', {
        method: 'POST',
        body: formData
      })
      
      console.log(`APIレスポンス: status=${response.status}, ok=${response.ok}`);
      
      // APIからのエラーレスポンスを処理
      if (!response.ok) {
        let errorMessage = 'Quarto PowerPoint変換エラー';
        try {
          // JSONエラーレスポンスを解析
          const errorData = await response.json();
          errorMessage = errorData.error || 'Quarto PowerPoint変換エラー';
          console.error('APIエラーレスポンス:', errorData);
        } catch (jsonError) {
          // JSONでない場合はテキストを取得
          const errorText = await response.text();
          errorMessage = errorText || 'Quarto PowerPoint変換エラー';
          console.error('APIエラーテキスト:', errorText);
        }
        throw new Error(errorMessage);
      }
      
      // Content-Typeを確認
      const contentType = response.headers.get('Content-Type');
      console.log(`レスポンスのContent-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        // JSONレスポンスの場合はエラーとして処理
        const jsonData = await response.json();
        console.error('JSONレスポンス (エラーの可能性):', jsonData);
        throw new Error(jsonData.error || 'Quarto PowerPoint変換エラー');
      }
      
      // 処理時間のデバッグ情報
      const processingTime = response.headers.get('X-Processing-Time');
      if (processingTime) {
        console.log(`サーバー処理時間: ${processingTime}`);
      }
      
      // BlobとしてPPTXファイルを取得
      console.log('レスポンスデータをBlobとして取得します...');
      const pptxBlob = await response.blob();
      console.log(`Blobサイズ: ${pptxBlob.size} バイト, タイプ: ${pptxBlob.type}`);
      
      // ファイルサイズの確認
      if (pptxBlob.size === 0) {
        throw new Error('生成されたPPTXファイルが空です');
      }
      
      // ファイル名を決定 - マークダウンの先頭行から決定
      let fileName = 'presentation.pptx'
      const firstLine = markdownContent.split('\n')[0] || ''
      const title = firstLine.replace(/^#+\s*/, '').trim()
      if (title) {
        fileName = `${title.replace(/\s+/g, '_').replace(/[\/\\?%*:|"<>]/g, '_')}.pptx`
      }
      console.log(`ファイル名: ${fileName}`);
      
      // ダウンロード
      console.log('ファイルをダウンロードします...');
      const url = URL.createObjectURL(pptxBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      
      // クリーンアップ
      setTimeout(() => {
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
        console.log('ダウンロードリンクのクリーンアップ完了');
      }, 100)
      
      console.log('Quarto PowerPointファイルが正常に生成されました')
    } catch (error) {
      console.error('Quarto PowerPoint変換エラー詳細:', error)
      alert(error instanceof Error ? error.message : '変換中に不明なエラーが発生しました')
    } finally {
      setIsQuartoPptxGenerating(false)
    }
  }

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
  const editorExtensions = useMemo(() => {
    const extensions = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        // エディタの更新時やフォーカス変更時にポップアップ/パネルに枠線をつける
        if (update.docChanged || update.selectionSet || update.focusChanged || update.viewportChanged) {
          setTimeout(() => {
            // CodeMirrorが生成する可能性のある要素を広範囲に選択
            document.querySelectorAll(
              '.cm-tooltip, .cm-panel, .cm-dialog, .cm-widgetBuffer, .cm-vimMode-command-dialog, .cm-search-panel' // より広範なセレクタ
            )
            .forEach(el => {
              if (el instanceof HTMLElement) {
                 // デバッグ用に非表示ではなく、赤い枠線をつける
                 el.style.setProperty('border', '1px solid red', 'important');
                 // 一時的に表示を維持（ただし操作はできないように）
                 el.style.setProperty('visibility', 'visible', 'important');
                 el.style.setProperty('opacity', '0.5', 'important'); // 半透明にする
                 el.style.setProperty('pointer-events', 'none', 'important');
                 // 表示位置に関するスタイルは削除（本来の位置で見えるように）
                 // el.style.removeProperty('position');
                 // el.style.removeProperty('top');
                 // el.style.removeProperty('left');
                 // el.style.removeProperty('display');
              }
            });
            // エディタにフォーカスを戻す
            // viewRef.current?.contentDOM?.focus(); // デバッグ中はフォーカス移動を一旦コメントアウト
          }, 50); // 遅延
        }

        // カーソル位置更新の処理
        if (update.selectionSet || update.docChanged) {
          if (update.view.hasFocus) {
            handleCursorUpdate(update.view);
          }
        }
      }),
      // EditorView.theme でデバッグ用の枠線を追加
      EditorView.theme({
        ".cm-tooltip, .cm-panel, .cm-dialog, .cm-widgetBuffer, .cm-vimMode-command-dialog, .cm-search-panel, .cm-completion*, .cm-vim*, .cm-search*, .cm-popup": {
           /* 非表示スタイルはコメントアウト */
           /* display: "none !important", */
           /* visibility: "hidden !important", */
           /* opacity: "0 !important", */
           /* pointerEvents: "none !important", */
           /* position: "absolute !important", */
           /* top: "-9999px !important", */
           /* left: "-9999px !important", */
           border: "1px dashed blue !important" // テーマによる枠線は青い破線
         },
      }),
      // キー入力ハンドラ
      EditorView.domEventHandlers({
        keydown: (event, view) => {
          // デバッグログ：押されたキーを出力
          console.log(`Keydown: key=${event.key}, code=${event.code}, ctrl=${event.ctrlKey}, shift=${event.shiftKey}, alt=${event.altKey}, meta=${event.metaKey}`);

          // Ctrl+Space は無効化
          if (event.ctrlKey && (event.code === "Space" || event.key === " ")) {
            console.log("Ctrl+Space intercepted.");
            event.preventDefault();
            return true;
          }
          
          // Tabキーはスペースを挿入
          if (event.key === "Tab" && !event.ctrlKey && !event.altKey && !event.metaKey) {
            console.log("Tab key intercepted for indent.");
            const pos = view.state.selection.main.head;
            const spaces = "  ";
            view.dispatch({
              changes: { from: pos, to: pos, insert: spaces }
            });
            event.preventDefault();
            return true;
          }

          // エスケープキーでポップアップ要素に赤い枠線をつける
          if (event.key === "Escape") {
            console.log("Escape key pressed, applying debug borders.");
            setTimeout(() => {
              document.querySelectorAll('.cm-tooltip, .cm-panel, .cm-dialog, .cm-vimMode-command-dialog, .cm-search-panel')
                .forEach(el => {
                  if (el instanceof HTMLElement) {
                     el.style.setProperty('border', '2px solid red', 'important');
                     el.style.setProperty('visibility', 'visible', 'important');
                     el.style.setProperty('opacity', '0.7', 'important');
                  }
                });
              // view.contentDOM.focus(); // デバッグ中はフォーカス移動を一旦コメントアウト
            }, 10);
            return false; // Vimの標準エスケープ処理を許可
          }
          
          return false;
        }
      })
    ];
    
    // Vimモードが有効な場合
    if (isVimMode) {
      // Vim拡張を追加 (status表示は無効)
      extensions.push(vim({ status: false }));
    }
    
    return extensions;
  }, [handleCursorUpdate, isVimMode]);

  // エディタコンポーネント
  const EditorComponent = (
    <EmojiContextMenu onEmojiSelect={insertEmoji}>
      <CodeMirror
        value={markdownContent}
        height="100%"
        extensions={editorExtensions}
        onChange={handleContentChange}
        theme={isDarkMode ? vscodeDark : xcodeLight}
        className={`text-md ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}
        onCreateEditor={(view, state) => {
          viewRef.current = view;
          console.log("CodeMirror editor instance created and viewRef set.");
          handleCursorUpdate(view);
          
          // CSSによるポップアップ非表示スタイルを削除またはコメントアウト
          const styleId = 'codemirror-popup-hider';
          let styleElement = document.getElementById(styleId);
          if (styleElement) {
             // 既存の非表示スタイルを削除
             // styleElement.remove(); 
             // またはデバッグ用に内容を書き換え
             styleElement.textContent = `
               /* Debug Styles - Apply borders to potential popups */
               .cm-tooltip, .cm-panel, .cm-dialog, .cm-widgetBuffer, 
               .cm-vimMode-command-dialog, .cm-search-panel, 
               .cm-completion*, .cm-vim*, .cm-search*, .cm-popup {
                 border: 1px solid lime !important; /* 初期状態は緑の枠線 */
                 opacity: 0.8 !important; 
                 pointer-events: auto !important; /* イベントを一時的に許可してデバッグしやすくする */
                 /* visibility: visible !important; */ /* 必要ならコメント解除 */
               }
             `;
          } else {
             // 新しくデバッグ用スタイルを作成
             styleElement = document.createElement('style');
             styleElement.id = styleId;
             styleElement.textContent = `
               /* Debug Styles - Apply borders to potential popups */
               .cm-tooltip, .cm-panel, .cm-dialog, .cm-widgetBuffer, 
               .cm-vimMode-command-dialog, .cm-search-panel, 
               .cm-completion*, .cm-vim*, .cm-search*, .cm-popup {
                 border: 1px solid lime !important; /* 初期状態は緑の枠線 */
                 opacity: 0.8 !important; 
                 pointer-events: auto !important; /* イベントを一時的に許可してデバッグしやすくする */
                 /* visibility: visible !important; */ /* 必要ならコメント解除 */
               }
             `;
             document.head.appendChild(styleElement);
          }
          // 初期フォーカス設定
          // view.contentDOM.focus(); // デバッグ中は一旦コメントアウト
        }}
        // basicSetup は前回修正した最小限の状態を維持
        basicSetup={{
          lineNumbers: true,
          /* highlightActiveLine: false, */
          /* highlightSpecialChars: false, */
          /* foldGutter: false, */
          /* drawSelection: false, */
          /* dropCursor: false, */
          allowMultipleSelections: true, 
          /* indentOnInput: false, */
          syntaxHighlighting: true, 
          autocompletion: false, 
          tabSize: 2,
          /* highlightSelectionMatches: false, */
          /* closeBrackets: false, */
          /* searchKeymap: false, */
          /* completionKeymap: false, */
          /* historyKeymap: false, */
          /* foldKeymap: false, */
          /* lintKeymap: false, */
        }}
      />
    </EmojiContextMenu>
  )

  // 通常のMarkdownプレビューコンポーネント（ReactMarkdownを使用）
  const PreviewComponent = (
    <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div ref={tabPreviewRef} className="markdown-preview p-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              
              return !match ? (
                <code className={className} {...props}>
                  {children}
                </code>
              ) : (
                <SyntaxHighlighter
                  // @ts-ignore - スタイルの型の問題を無視
                  language={match[1]}
                  PreTag="div"
                  style={isDarkMode ? oneDark : oneLight}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              )
            },
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  )

  // Marpプレビューコンポーネント（MarpPreviewを使用）
  const MarpPreviewComponent = (
    <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div ref={tabPreviewRef} className="markdown-preview p-4">
        <MarpPreview 
          markdown={markdownContent} 
          isDarkMode={isDarkMode} 
        />
      </div>
    </div>
  )

  // Quartoプレビューコンポーネント
  const QuartoPreviewComponent = (
    <div className="quarto-preview-wrapper h-full overflow-auto h-[calc(100vh-8rem)]">
      <div ref={tabPreviewRef} className="markdown-preview h-full">
        <QuartoPreview
          markdown={markdownContent}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );

  // 選択範囲の色を設定するためのuseEffect
  useEffect(() => {
    // スタイルシートを動的に追加
    const styleElement = document.createElement('style');
    styleElement.id = 'codemirror-selection-styles';
    
    // Lightモード用の選択範囲スタイル (より鮮明な黄色系)
    const lightModeStyles = `
      .cm-editor:not(.cm-focused) .cm-selectionBackground {
        background-color: rgba(255, 213, 0, 0.4) !important;
      }
      .cm-editor.cm-focused .cm-selectionBackground {
        background-color: rgba(255, 213, 0, 0.7) !important;
      }
    `;
    
    // Darkモード用の選択範囲スタイル
    const darkModeStyles = `
      .dark .cm-editor .cm-selectionBackground {
        background-color: rgba(100, 100, 150, 0.4) !important;
      }
      .dark .cm-editor.cm-focused .cm-selectionBackground {
        background-color: rgba(100, 100, 170, 0.6) !important;
      }
    `;
    
    styleElement.textContent = lightModeStyles + darkModeStyles;
    document.head.appendChild(styleElement);
    
    // クリーンアップ関数
    return () => {
      const existingStyle = document.getElementById('codemirror-selection-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []); // 空の依存配列でマウント時のみ実行

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <EmojiPicker onEmojiSelect={insertEmoji} />
                </PopoverContent>
              </Popover>
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    const marpHeader = `---
marp: true
theme: default
${isDarkMode ? 'class: invert' : '# class: invert'}
paginate: true
header: "ヘッダ"
footer: "フッタ"
---

`;
                    // エディタの先頭に挿入
                    setMarkdownContent(marpHeader + markdownContent);
                  }}>
                    <Presentation className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marpヘッダ</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    const quartoHeader = `---
title: "Quarto Basics"
format:
  html:
    code-fold: true
jupyter: python3
---

`;
                    // エディタの先頭に挿入
                    setMarkdownContent(quartoHeader + markdownContent);
                  }}>
                    <FileCode className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quartoヘッダ</TooltipContent>
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
          <div className="flex items-center space-x-2">
            {/* Google Drive連携部分 */}
            <div className="flex items-center mr-4 space-x-2">
              <Switch 
                checked={driveEnabled} 
                onCheckedChange={handleDriveToggle}
                disabled={!isAuthenticated}
                label="Google Drive連携"
              />
              <GoogleAuth onAuthChange={handleAuthChange} />
            </div>

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


            {/* Marpボタン */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'marp-preview' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('marp-preview')}
                  >
                    <Presentation size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marpプレゼンテーションプレビュー</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'marp-split' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('marp-split')}
                  >
                    <Columns size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>エディタとMarpプレビューを分割表示</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'quarto-preview' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('quarto-preview')}
                  >
                    <FileCode size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quartoプレビュー</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'quarto-split' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('quarto-split')}
                  >
                    <SplitSquareVertical size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>エディタとQuartoプレビューを分割表示</TooltipContent>
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
                    {isSaving ? (
                      <>
                        <span className="animate-spin mr-1">⌛</span>
                        <span className="hidden sm:inline">保存中...</span>
                      </>
                    ) : (
                      <>
                        {driveEnabled && isAuthenticated ? <Upload className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                        <span className="hidden sm:inline">Save</span>
                        {driveEnabled && isAuthenticated && (
                          <span className="text-xs ml-1">(Drive)</span>
                        )}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {driveEnabled && isAuthenticated 
                    ? "Google Driveに保存" 
                    : "ローカルに保存"}
                </TooltipContent>
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
              
              {/* PowerPoint変換ボタン */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportToPptx} 
                    className="h-8 gap-1"
                    disabled={isPptxGenerating}
                  >
                    {isPptxGenerating ? (
                      <>
                        <span className="animate-spin mr-1">⌛</span>
                        <span className="hidden sm:inline">変換中...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        <span className="hidden sm:inline">PPTX</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>PowerPointとして出力</TooltipContent>
              </Tooltip>
              
              {/* Quarto PPTX変換ボタン */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportToQuartoPptx} 
                    className="h-8 gap-1"
                    disabled={isQuartoPptxGenerating}
                  >
                    {isQuartoPptxGenerating ? (
                      <>
                        <span className="animate-spin mr-1">⌛</span>
                        <span className="hidden sm:inline">変換中...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Q-PPTX</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>QuartoでPowerPointとして出力</TooltipContent>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={toggleVimMode} className="h-8 gap-1">
                    <Terminal className="h-4 w-4" />
                    <span className="hidden sm:inline">{isVimMode ? "Vim:ON" : "Vim:OFF"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isVimMode ? "Vimモードをオフにする" : "Vimモードをオンにする"}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      <div className="h-[calc(100%-3rem)]">
        {viewMode === 'editor' && (
          <ResizablePanelGroup direction="horizontal" className={`${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'} h-full`}>
            {driveEnabled && isAuthenticated && accessToken && (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                  <GoogleDriveFileList 
                    accessToken={accessToken} 
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFile?.id}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
              </>
            )}
            <ResizablePanel defaultSize={driveEnabled ? 85 : 100}>
              <div className="h-full overflow-auto">
                {EditorComponent}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        
        {viewMode === 'preview' && (
          <ResizablePanelGroup direction="horizontal" className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} h-full`}>
            {driveEnabled && isAuthenticated && accessToken && (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                  <GoogleDriveFileList 
                    accessToken={accessToken} 
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFile?.id}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
              </>
            )}
            <ResizablePanel defaultSize={driveEnabled ? 85 : 100}>
              {PreviewComponent}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        
        {viewMode === 'split' && (
          <ResizablePanelGroup direction="horizontal" className={`h-full gap-2 ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
            {driveEnabled && isAuthenticated && accessToken && (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                  <GoogleDriveFileList 
                    accessToken={accessToken} 
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFile?.id}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
              </>
            )}
            <ResizablePanel defaultSize={driveEnabled ? 42 : 50}>
              <div className={`${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'} h-full overflow-auto`}>
                {EditorComponent}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
            <ResizablePanel defaultSize={driveEnabled ? 43 : 50}>
              <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} h-full`}>
                {PreviewComponent}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        
        {viewMode === 'triple' && (
          <TripleLayout
            editorComponent={
              <div className="h-full overflow-auto">
                {EditorComponent}
              </div>
            }
            previewComponent={PreviewComponent}
            onAIContentInsert={handleAIContentInsert}
            isDarkMode={isDarkMode}
            messages={messages}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            clearMessages={clearMessages}
            driveEnabled={driveEnabled && isAuthenticated}
            driveFileListComponent={
              driveEnabled && isAuthenticated && accessToken ? (
                <GoogleDriveFileList 
                  accessToken={accessToken} 
                  onFileSelect={handleFileSelect}
                  selectedFileId={selectedFile?.id}
                />
              ) : null
            }
            getEditorContent={() => markdownContent}
            setInput={setInput}
            append={append}
          />
        )}

        {viewMode === 'marp-preview' && (
          <ResizablePanelGroup direction="horizontal" className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} h-full`}>
            {driveEnabled && isAuthenticated && accessToken && (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                  <GoogleDriveFileList 
                    accessToken={accessToken} 
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFile?.id}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
              </>
            )}
            <ResizablePanel defaultSize={driveEnabled ? 85 : 100}>
              {MarpPreviewComponent}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {viewMode === 'quarto-preview' && (
          <ResizablePanelGroup direction="horizontal" className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} h-full`}>
            {driveEnabled && isAuthenticated && accessToken && (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                  <GoogleDriveFileList 
                    accessToken={accessToken} 
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFile?.id}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
              </>
            )}
            <ResizablePanel defaultSize={driveEnabled ? 85 : 100}>
              {QuartoPreviewComponent}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {viewMode === 'marp-split' && (
          <ResizablePanelGroup direction="horizontal" className={`h-full gap-2 ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
            {driveEnabled && isAuthenticated && accessToken && (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                  <GoogleDriveFileList 
                    accessToken={accessToken} 
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFile?.id}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
              </>
            )}
            <ResizablePanel defaultSize={driveEnabled ? 42 : 50}>
              <div className={`${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'} h-full overflow-auto`}>
                {EditorComponent}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
            <ResizablePanel defaultSize={driveEnabled ? 43 : 50}>
              <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} h-full`}>
                {MarpPreviewComponent}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {viewMode === 'quarto-split' && (
          <ResizablePanelGroup direction="horizontal" className={`h-full gap-2 ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
            {driveEnabled && isAuthenticated && accessToken && (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                  <GoogleDriveFileList 
                    accessToken={accessToken} 
                    onFileSelect={handleFileSelect}
                    selectedFileId={selectedFile?.id}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
              </>
            )}
            <ResizablePanel defaultSize={driveEnabled ? 42 : 50}>
              <div className={`${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'} h-full overflow-auto`}>
                {EditorComponent}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className={isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"} />
            <ResizablePanel defaultSize={driveEnabled ? 43 : 50}>
              <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} h-full`}>
                {QuartoPreviewComponent}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  )
}

