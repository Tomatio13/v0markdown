"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Bold, Italic, List, ListOrdered, Quote, Code, Link, Image, Save, Printer, Heading1, Heading2, Heading3, Table, CheckSquare, Moon, Sun, Smile, Box, MessageSquare, SplitSquareVertical, Trash2, Terminal, Upload, Presentation, Columns, FileDown, FileCode, BotMessageSquare, FileChartColumn, ChartColumn
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus, oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism" // スタイルをまとめてインポート
import CodeMirror from "@uiw/react-codemirror"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { xcodeLight } from "@uiw/codemirror-theme-xcode" // xcodeLight を別パッケージからインポート
import { EditorView, keymap, lineNumbers } from "@codemirror/view" // view関連をまとめてインポート
import { vim } from "@replit/codemirror-vim"
import { EmojiPicker, EmojiContextMenu } from "./emoji-picker"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu"
import MermaidDiagram from "./mermaid-diagram"
import { AIChat } from "./ai-chat"
import { TripleLayout } from "./triple-layout"
import { useChat, Message, CreateMessage } from "ai/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { GoogleFile } from "@/lib/types"
import { v4 as uuidv4 } from 'uuid'
import { Switch } from "@/components/ui/switch"
import GoogleAuth from "./google-auth"
import GoogleDriveFileList from "./google-drive-file-list"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import MarpPreview from "./marp-preview"
import QuartoPreview from "./quarto-preview"
import TableOfContents from "./table-of-contents" // Heading をここからインポート
import { ScrollArea } from "@/components/ui/scroll-area"
// Heading 型を TableOfContents からインポート
import { type Heading } from "./table-of-contents"; // 'type' を使ったインポートに修正
import { useAutoSave } from "@/hooks/use-auto-save";
import { loadDraft, deleteDraft } from "@/lib/draft-storage";

// --- グローバル型定義 ---
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

// --- コンポーネント本体 ---
export default function MarkdownEditor() {
  // --- State Variables ---

  // Editor State
  const [markdownContent, setMarkdownContent] = useState("# Hello, World!\n\n## Section 1\nSome text\n\n## Section 2\nMore text")
  const [isVimMode, setIsVimMode] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });

  // UI State
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split' | 'triple' | 'marp-preview' | 'marp-split' | 'quarto-preview' | 'quarto-split'>('split')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isPptxGenerating, setIsPptxGenerating] = useState(false)
  const [isQuartoPptxGenerating, setIsQuartoPptxGenerating] = useState(false)
  const [isTocVisible, setIsTocVisible] = useState(false);

  // Google Drive State
  const [driveEnabled, setDriveEnabled] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<GoogleFile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // AI Chat State (using useChat hook)
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput, append, reload, stop } = useChat();

  // --- Refs ---

  // Editor Refs
  // const editorRef = useRef<EditorView | null>(null) // 以前の未使用のref？ (現在 onCreateEditor で viewRef を使用)
  const viewRef = useRef<EditorView | null>(null) // CodeMirrorのビューインスタンス用
  const cursorPosRef = useRef<number>(0) // フォールバック用カーソル位置

  // Preview Refs
  const previewRef = useRef<HTMLDivElement>(null) // 以前の未使用のref?
  const splitPreviewRef = useRef<HTMLDivElement>(null) // 印刷用
  const tabPreviewRef = useRef<HTMLDivElement>(null) // 印刷用

  // UI Refs
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Derived State ---
  // H1/H2見出し抽出 (ネスト構造、行番号は1-based)
  const extractedHeadings = useMemo(() => {
    const headings: Heading[] = []; // 型を Heading[] に指定
    let currentH1: Heading | null = null;
    const lines = markdownContent.split('\n');
    let inCodeBlock = false; // コードブロック内かどうかのフラグ

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // コードブロックの開始/終了を検出
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return; // ``` の行自体は見出しではないので処理をスキップ
      }

      // コードブロック内は無視
      if (inCodeBlock) {
        return;
      }

      // 見出しの抽出 (コードブロック外のみ)
      if (line.startsWith('# ')) {
        const text = line.substring(2).trim();
        // level を 1 として明示的に指定
        currentH1 = { level: 1, text, line: lineNumber, children: [] };
        headings.push(currentH1);
      } else if (line.startsWith('## ')) {
        const text = line.substring(3).trim();
        // level を 2 として明示的に指定
        const h2: Heading = { level: 2, text, line: lineNumber };
        if (currentH1) {
          // children も Heading[] 型であることを確認
          if (!currentH1.children) {
            currentH1.children = [];
          }
          currentH1.children.push(h2);
        }
        // H1なしでH2が出現した場合の処理は不要 (型チェックでエラーになるため)
        // もし許容する場合は、TableOfContents側の型定義も修正が必要
        // 今回は H1 の下に H2 がある構造のみを抽出する -> 既存ロジック踏襲
      }
    });

    return headings;
  }, [markdownContent]);

  // --- Editor Core Functions ---

  // CodeMirrorの内容変更ハンドラ
  const handleContentChange = useCallback((value: string) => {
    setMarkdownContent(value)
  }, [])

  // カーソル位置更新ハンドラ (行・列表示用)
  const handleCursorUpdate = useCallback((view: EditorView | null) => {
    if (view) {
      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      const lineNum = line.number;
      const colNum = pos - line.from + 1; // 1-based column
      setCursorPosition(prevPos => {
        if (prevPos.line !== lineNum || prevPos.col !== colNum) {
          // console.log("カーソル位置を更新:", lineNum, colNum); // デバッグ用
          return { line: lineNum, col: colNum };
        }
        return prevPos;
      });
    }
  }, [setCursorPosition]);

  // CodeMirror拡張機能 (Vimモード切替、行番号、リスナーなど)
  const editorExtensions = useMemo(() => {
    const extensions = [
      lineNumbers(),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        // デバッグ用枠線 (ここではコメントアウト)
        /* if (update.docChanged || update.selectionSet || update.focusChanged || update.viewportChanged) { ... } */

        // カーソル位置更新
        if (update.selectionSet || update.docChanged) {
          if (update.view.hasFocus) {
            handleCursorUpdate(update.view);
          }
        }
      }),
      EditorView.theme({
        // デバッグ用枠線 (ここではコメントアウト)
        /* ".cm-tooltip, .cm-panel, ...": { border: "1px dashed blue !important" } */
      }),
      EditorView.domEventHandlers({
        keydown: (event, view) => {
          // console.log(`Keydown: key=${event.key}, code=${event.code}, ctrl=${event.ctrlKey}, shift=${event.shiftKey}, alt=${event.altKey}, meta=${event.metaKey}`);
          if (event.ctrlKey && (event.code === "Space" || event.key === " ")) {
            event.preventDefault(); return true;
          }
          if (event.key === "Tab" && !event.ctrlKey && !event.altKey && !event.metaKey) {
            const pos = view.state.selection.main.head;
            view.dispatch({ changes: { from: pos, to: pos, insert: "  " } });
            event.preventDefault(); return true;
          }
          if (event.key === "Escape") {
            // console.log("Escape key pressed, applying debug borders.");
            // デバッグ用枠線 (ここではコメントアウト)
            /* setTimeout(() => { ... }, 10); */
            return false; // Allow standard escape behavior
          }
          return false;
        }
      })
    ];
    if (isVimMode) {
      extensions.push(vim({ status: false }));
    }
    return extensions;
  }, [handleCursorUpdate, isVimMode]);

  // --- Editor Action Handlers ---

  // テキスト挿入 (ツールバーボタン用)
  const insertText = useCallback((before: string, after = "") => {
    if (viewRef.current) {
      const view = viewRef.current;
      const state = view.state;
      const selection = state.selection.main;
      const selectedText = state.sliceDoc(selection.from, selection.to);
      const newText = before + selectedText + after;

      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: newText },
        selection: { anchor: selection.from + before.length, head: selection.from + before.length + selectedText.length },
        userEvent: "input"
      });
      view.focus();
      // カーソル位置は updateListener で更新される想定
    } else {
      // フォールバック (非推奨)
      console.warn("viewRef is not available for insertText. Falling back.");
      const selection = window.getSelection?.()?.toString() || "";
      const newText = before + selection + after;
      setMarkdownContent((prev) => {
        const pos = cursorPosRef.current;
        const safePos = Math.max(0, Math.min(pos, prev.length));
        // 簡易的な置換または挿入
        if (selection && prev.includes(selection)) {
           return prev.replace(selection, newText);
        } else {
           const newContent = prev.substring(0, safePos) + newText + prev.substring(safePos);
           cursorPosRef.current = safePos + newText.length;
           return newContent;
        }
      });
    }
  }, [setMarkdownContent]); // viewRef は ref なので依存配列に含めない

  // 絵文字挿入ハンドラ
  const insertEmoji = useCallback((emoji: string) => {
    if (viewRef.current) {
      const view = viewRef.current;
      const currentPos = view.state.selection.main.head;
      view.dispatch({
        changes: { from: currentPos, to: currentPos, insert: emoji },
        selection: { anchor: currentPos + emoji.length }
      });
      view.focus();
      cursorPosRef.current = currentPos + emoji.length; // 一応更新
    } else {
      console.warn("viewRef is not available for emoji insertion. Falling back.");
      setMarkdownContent(prev => {
        const pos = cursorPosRef.current;
        const safePos = Math.max(0, Math.min(pos, prev.length));
        const newContent = prev.substring(0, safePos) + emoji + prev.substring(safePos);
        cursorPosRef.current = safePos + emoji.length;
        return newContent;
      });
    }
  }, [setMarkdownContent]); // viewRef は ref なので依存配列に含めない

  // AIからのコンテンツ挿入ハンドラ
  const handleAIContentInsert = useCallback((text: string) => {
    if (viewRef.current) {
      const view = viewRef.current;
      const currentPos = view.state.selection.main.head;
      view.dispatch({
        changes: { from: currentPos, to: currentPos, insert: text },
        selection: { anchor: currentPos + text.length }
      });
      view.focus();
      cursorPosRef.current = currentPos + text.length; // 一応更新
    } else {
      console.warn("viewRef is not available for AI content insertion. Falling back.");
      setMarkdownContent(prev => {
        const pos = cursorPosRef.current;
        const safePos = Math.max(0, Math.min(pos, prev.length));
        const newContent = prev.substring(0, safePos) + text + prev.substring(safePos);
        cursorPosRef.current = safePos + text.length;
        return newContent;
      });
    }
  }, [setMarkdownContent]); // viewRef は ref なので依存配列に含めない

  // 画像アップロードハンドラ
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Reset input

    if (!file || !file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-image', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `画像アップロードエラー: ${response.status}`);
      }
      const data = await response.json();
      const imageUrl = `![](${window.location.origin}${data.url})`; // Generate markdown image link

      // Insert into CodeMirror
      if (viewRef.current) {
        const view = viewRef.current;
        const currentPos = view.state.selection.main.head;
        view.dispatch({
          changes: { from: currentPos, to: currentPos, insert: imageUrl },
          selection: { anchor: currentPos + imageUrl.length },
        });
        view.focus();
        cursorPosRef.current = currentPos + imageUrl.length; // 一応更新
      } else {
        console.warn("viewRef is not available for image insertion. Falling back.");
        setMarkdownContent(prev => {
          const pos = cursorPosRef.current;
          const safePos = Math.max(0, Math.min(pos, prev.length));
          const newContent = prev.substring(0, safePos) + imageUrl + prev.substring(safePos);
          cursorPosRef.current = safePos + imageUrl.length;
          return newContent;
        });
      }
    } catch (error: any) {
      console.error('画像アップロード処理エラー:', error);
      alert(error.message || '画像のアップロードに失敗しました。');
    } finally {
      setIsUploadingImage(false);
    }
  }, [setMarkdownContent]); // viewRef は ref なので依存配列に含めない

  // エディタ内容クリアハンドラ
  const handleClearContent = useCallback(() => {
    setMarkdownContent("");
    cursorPosRef.current = 0;
    if (viewRef.current) {
      viewRef.current.focus();
    }
  }, [setMarkdownContent]);

  // Vimモード切り替えハンドラ
  const toggleVimMode = useCallback(() => {
    if (viewRef.current) {
      // 現在のカーソル位置を取得 (Vim切替時のカーソル維持のため)
      cursorPosRef.current = viewRef.current.state.selection.main.head;
      // console.log('Vimモード切り替え前のカーソル位置:', cursorPosRef.current);
    }
    setIsVimMode(prev => !prev);
    // 遅延実行してVim拡張が再適用されるのを待つ
    setTimeout(() => {
      if (viewRef.current) {
        // console.log('Vimモード切り替え後にフォーカスとカーソル位置設定試行');
        viewRef.current.focus();
        try {
           viewRef.current.dispatch({ selection: { anchor: cursorPosRef.current } });
          // console.log('カーソル位置設定成功:', cursorPosRef.current);
        } catch (e) {
          console.error("カーソル位置の設定に失敗しました:", e)
        }
      }
    }, 100); // 100ms待つ
  }, [setIsVimMode]); // viewRef は ref なので依存配列に含めない

  // 目次表示切り替えハンドラ ★追加
  const toggleToc = useCallback(() => {
    setIsTocVisible(prev => !prev);
  }, [setIsTocVisible]);

  // Marpマニュアル表示ハンドラ
  const handleOpenMarpManual = useCallback(() => {
    // 新しいAPIエンドポイントを使用
    const manualPath = '/manual/marp_manual.md';
    const previewUrl = `/api/preview-markdown?path=${encodeURIComponent(manualPath)}`;
    window.open(previewUrl, '_blank');
  }, []);

  // Quartoマニュアル表示ハンドラ
  const handleOpenQuartoManual = useCallback(() => {
    // 新しいAPIエンドポイントを使用
    const manualPath = '/manual/quatro_manual.md';
    const previewUrl = `/api/preview-markdown?path=${encodeURIComponent(manualPath)}`;
    window.open(previewUrl, '_blank');
  }, []);

  // --- Jump Function ---
  const handleTocJump = useCallback((lineNumber: number) => {
    if (viewRef.current) {
      const view = viewRef.current;
      try {
        const line = view.state.doc.line(lineNumber); // lineNumber は 1-based
        const position = line.from;
        view.dispatch({
          effects: EditorView.scrollIntoView(position, { y: "start", yMargin: 10 }), // 少しマージンを持たせる
          selection: { anchor: position } // カーソルも移動
        });
        view.focus(); // エディタにフォーカスを戻す
      } catch (e) {
        console.error(`Failed to jump to line ${lineNumber}:`, e);
      }
    }
  }, []); // viewRef は ref なので依存配列に含めない

  // --- File & Export Handlers ---

  // ファイル名生成ヘルパー
  const generateFileName = (content: string, defaultExt: string = 'md'): string => {
    const firstLine = content.split('\n')[0] || '';
    let baseName = firstLine.replace(/^#+\s*/, '').trim();
    baseName = baseName.replace(/\s+/g, '_'); // スペースをアンダースコアに
    baseName = baseName.replace(/[\\/:*?"<>|]/g, '_'); // ファイル名に使えない文字を置換
    const potentialFileName = baseName ? `${baseName}.${defaultExt}` : '';
    return potentialFileName || `untitled-${uuidv4().substring(0, 8)}.${defaultExt}`;
  };

  // Google Drive 保存ハンドラ
  const handleDriveSave = useCallback(async () => {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      const fileName = selectedFile?.name || generateFileName(markdownContent);
      const method = selectedFile ? 'PUT' : 'POST';
      const response = await fetch('/api/drive/save', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: fileName,
          content: markdownContent,
          fileId: selectedFile?.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const savedFileData = await response.json();
      setSelectedFile({
        id: savedFileData.id,
        name: savedFileData.name,
        mimeType: 'text/markdown',
        modifiedTime: savedFileData.modifiedTime
      });
      console.log('Google Driveに保存しました:', savedFileData);
    } catch (error: any) {
      console.error('Google Drive保存エラー:', error);
      alert(error.message || 'Google Driveへの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, markdownContent, selectedFile, setSelectedFile]); // generateFileNameは外部関数なので不要

  // ローカル保存ハンドラ (File System Access API or fallback)
  const handleLocalSave = async () => {
    setIsSaving(true);
    try {
      const suggestedName = generateFileName(markdownContent);
      if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker === 'function') {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(markdownContent);
        await writable.close();
        console.log("ファイルが保存されました (File System Access API)");
      } else {
        // Fallback
        const blob = new Blob([markdownContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("従来の方法でファイルがダウンロードされました");
      }
    } catch (error) {
      console.error("ファイル保存エラー:", error);
      // エラー時もフォールバックを試みる (ユーザーキャンセルを除く)
      if ((error as DOMException).name !== 'AbortError') {
         try {
           const suggestedName = generateFileName(markdownContent);
           const blob = new Blob([markdownContent], { type: "text/markdown" });
           const url = URL.createObjectURL(blob);
           const a = document.createElement("a"); a.href = url; a.download = suggestedName;
           document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
         } catch (fallbackError) {
           console.error("フォールバック保存エラー:", fallbackError);
           alert("ファイルの保存に失敗しました。");
         }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 統合保存ハンドラ
  const handleSave = useCallback(async () => {
    if (driveEnabled && isAuthenticated && accessToken) {
      await handleDriveSave();
    } else {
      await handleLocalSave();
    }
  }, [driveEnabled, isAuthenticated, accessToken, handleDriveSave, handleLocalSave]); // 依存関係を修正

  // 印刷ハンドラ
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // 表示中のプレビュー要素を取得
    // MermaidがレンダリングしたSVGを含む可能性のある要素を優先的に試す
    const activePreviewElement =
      document.querySelector('.tabs-content[data-state="active"] .prose') ||
      splitPreviewRef.current || // Split view のプレビュー
      tabPreviewRef.current;     // Tab view のプレビュー

    const currentPreviewContent = activePreviewElement?.innerHTML || "プレビューコンテンツが見つかりません。";
    const htmlContent = `
    <!DOCTYPE html><html><head><title>Markdown Preview</title><style>
    body{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;line-height:1.6;color:#333;max-width:800px;margin:0 auto;padding:20px;}
    pre{background-color:#1E1E1E;border-radius:3px;padding:16px;overflow:auto;color:#D4D4D4;}
    pre code{font-family:SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;background:none;padding:0;color:inherit;}
    code:not(pre > code){font-family:SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;background-color:rgba(27,31,35,.05);padding:.2em .4em;margin:0;font-size:85%;border-radius:3px;}
    .token.comment{color:#6A9955;}.token.string{color:#CE9178;}.token.keyword{color:#569CD6;}.token.function{color:#DCDCAA;}.token.number{color:#B5CEA8;}.token.operator{color:#D4D4D4;}.token.class-name{color:#4EC9B0;}
    table{border-collapse:collapse;width:100%;margin-bottom:16px;border-spacing:0;}
    table th, table td{border:1px solid #ddd;padding:8px 12px;text-align:left;}
    table tr:nth-child(even){background-color:#f6f8fa;}
    blockquote{border-left:4px solid #dfe2e5;padding:0 1em;margin-left:0;color:#6a737d;}
    img{max-width:100%;height:auto;display:block;}
    h1,h2,h3,h4,h5,h6{margin-top:24px;margin-bottom:16px;font-weight:600;line-height:1.25;}
    h1{font-size:2em;border-bottom:1px solid #eaecef;padding-bottom:0.3em;}
    h2{font-size:1.5em;border-bottom:1px solid #eaecef;padding-bottom:0.3em;}
    h3{font-size:1.25em;} h4{font-size:1em;} h5{font-size:.875em;} h6{font-size:.85em;color:#6a737d;}
    ul, ol{padding-left:2em;margin-top:0;margin-bottom:16px;}
    hr{height:0.25em;padding:0;margin:24px 0;background-color:#e1e4e8;border:0;}
    a{color:#0366d6;text-decoration:none;} a:hover{text-decoration:underline;}
    .task-list-item{list-style-type:none;} .task-list-item label{font-weight:normal;}
    .task-list-item.enabled label{cursor:pointer;} .task-list-item + .task-list-item{margin-top:3px;}
    .task-list-item input[type=checkbox]{margin:0 0.2em 0.25em -1.6em;vertical-align:middle;}
    .mermaid{text-align:center;margin-bottom:16px;}
    .mermaid svg{max-width:100%;height:auto !important;display:block;margin:0 auto;}
    /* Marp/Quarto 用のスタイルを追加 */
    /* (必要に応じて Marp/Quarto のデフォルトスタイルシートをリンクするか、主要なスタイルをここにコピー) */
    .marp-preview-slide, .quarto-slide { /* スライドの基本スタイル */
       border: 1px solid #ccc;
       margin-bottom: 1em;
       /* 他、Marp/Quarto が生成する HTML 構造に合わせたスタイル */
    }
    </style></head><body><div id="content">${currentPreviewContent}</div>
    <script>window.onload=function(){console.log('Content loaded, triggering print...');window.print();/* setTimeout(() => { window.close(); }, 500); */}</script>
    </body></html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // PowerPoint (PptxGenJS) へのエクスポートハンドラ
  const handleExportToPptx = async () => {
    console.log('PowerPoint変換処理を開始します...');
    setIsPptxGenerating(true);
    try {
      if (!markdownContent.trim()) {
        alert('マークダウンコンテンツが空です。'); return;
      }
      const formData = new FormData();
      formData.append('markdown', markdownContent);
      const response = await fetch('/api/export-to-pptx', { method: 'POST', body: formData });

      if (!response.ok) {
        let errorMessage = 'PowerPoint変換エラー';
        try { const errorData = await response.json(); errorMessage = errorData.error || errorMessage; }
        catch (e) { const errorText = await response.text(); errorMessage = errorText || errorMessage; }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const jsonData = await response.json(); throw new Error(jsonData.error || 'PPTX変換エラー');
      }
      if (response.headers.get('X-Processing-Time')) console.log(`サーバー処理時間: ${response.headers.get('X-Processing-Time')}`);

      const pptxBlob = await response.blob();
      if (pptxBlob.size === 0) throw new Error('生成されたPPTXファイルが空です');

      const fileName = generateFileName(markdownContent, 'pptx');
      const url = URL.createObjectURL(pptxBlob);
      const a = document.createElement('a'); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
      console.log('PowerPointファイルが正常に生成されました');
    } catch (error) {
      console.error('PowerPoint変換エラー詳細:', error);
      alert(error instanceof Error ? error.message : '変換中に不明なエラーが発生しました');
    } finally {
      setIsPptxGenerating(false);
    }
  };

  // Quarto (PPTX) へのエクスポートハンドラ
  const handleExportToQuartoPptx = async () => {
    console.log('Quarto PowerPoint変換処理を開始します...');
    setIsQuartoPptxGenerating(true);
    try {
      if (!markdownContent.trim()) {
        alert('マークダウンコンテンツが空です。'); return;
      }
      const formData = new FormData();
      formData.append('markdown', markdownContent);
      formData.append('format', 'pptx'); // Quarto APIにフォーマットを指定
      const response = await fetch('/api/export-to-quarto', { method: 'POST', body: formData });

      if (!response.ok) {
        let errorMessage = 'Quarto PowerPoint変換エラー';
        try { const errorData = await response.json(); errorMessage = errorData.error || errorMessage; }
        catch (e) { const errorText = await response.text(); errorMessage = errorText || errorMessage; }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const jsonData = await response.json(); throw new Error(jsonData.error || 'Quarto PPTX変換エラー');
      }
       if (response.headers.get('X-Processing-Time')) console.log(`サーバー処理時間: ${response.headers.get('X-Processing-Time')}`);

      const pptxBlob = await response.blob();
      if (pptxBlob.size === 0) throw new Error('生成されたPPTXファイルが空です');

      const fileName = generateFileName(markdownContent, 'pptx');
      const url = URL.createObjectURL(pptxBlob);
      const a = document.createElement('a'); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
      console.log('Quarto PowerPointファイルが正常に生成されました');
    } catch (error) {
      console.error('Quarto PowerPoint変換エラー詳細:', error);
      alert(error instanceof Error ? error.message : '変換中に不明なエラーが発生しました');
    } finally {
      setIsQuartoPptxGenerating(false);
    }
  };

  // --- Google Drive Handlers ---

  // 認証状態変更ハンドラ
  const handleAuthChange = useCallback((authenticated: boolean, token?: string) => {
    setIsAuthenticated(authenticated);
    setAccessToken(token || null);
    if (!authenticated) {
      setSelectedFile(null); // Logout clears selection
      setDriveEnabled(false); // Logout disables Drive integration
    }
  }, []); // No dependencies needed

  // Google Drive 有効/無効 切り替えハンドラ
  const handleDriveToggle = useCallback((enabled: boolean) => {
    if (enabled && !isAuthenticated) {
       alert("Google Driveにログインしてください。");
       return;
    }
    setDriveEnabled(enabled);
    if (!enabled) {
      setSelectedFile(null);
    }
  }, [isAuthenticated]); // isAuthenticated に依存

  // Google Drive ファイル選択ハンドラ
  const handleFileSelect = useCallback(async (file: GoogleFile) => {
    if (!accessToken) return;
    try {
      // APIルート経由でファイル内容を取得
      const response = await fetch(`/api/drive/read?fileId=${file.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const content = await response.text();
      setMarkdownContent(content);
      setSelectedFile(file);
      // ファイル選択後、エディタにフォーカスを戻す
      if (viewRef.current) {
          viewRef.current.focus();
          // 必要であればカーソルを先頭に移動
          viewRef.current.dispatch({ selection: { anchor: 0 } });
      }
    } catch (error: any) {
      console.error('ファイル読み込みエラー:', error);
      alert(error.message || 'ファイルを読み込めませんでした');
    }
  }, [accessToken, setMarkdownContent]); // viewRef は ref なので依存配列に含めない

  // --- AI Chat Handlers ---

  // チャットメッセージクリア
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  // --- UI Handlers ---

  // ダークモード切り替えハンドラ
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      document.documentElement.classList.toggle('dark', newMode);
      return newMode;
    });
  };

  // プレビューモード名取得ヘルパー
  const getPreviewModeName = () => {
    if (viewMode.includes('marp')) return 'Marp';
    if (viewMode.includes('quarto')) return 'Quarto';
    if (viewMode.includes('preview') || viewMode.includes('split')) return 'Markdown';
    return null;
  };

  // --- Effects ---

  // 初期フォーカス設定
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (viewRef.current) {
        viewRef.current.focus();
        // 初期カーソル位置を設定 (例: 末尾)
        const endPos = viewRef.current.state.doc.length;
        viewRef.current.dispatch({ selection: { anchor: endPos } });
        cursorPosRef.current = endPos; // フォールバック用も更新
        handleCursorUpdate(viewRef.current); // 初期カーソル位置をステータスバーに反映
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [handleCursorUpdate]); // handleCursorUpdate を依存配列に追加

  // --- Auto Save & Draft Restore ---
  useAutoSave({ content: markdownContent, fileId: selectedFile?.id });

  useEffect(() => {
    const restoreDraft = async () => {
      if (typeof window === 'undefined') return;
      const lastId = localStorage.getItem('lastDraftId');
      if (!lastId) return;

      try {
        const draft = await loadDraft(lastId);

        if (draft && draft.content) {
          // ドラフトが存在し、内容がある場合
          if (window.confirm('前回の自動保存データを復元しますか？')) {
            setMarkdownContent(draft.content);
            // オプション: 復元したらlocalStorageのIDはクリアしても良いかも
            // localStorage.removeItem('lastDraftId');
          } else {
            // 復元しない場合はドラフト削除
            await deleteDraft(lastId);
            localStorage.removeItem('lastDraftId');
          }
        } else if (draft === null) {
          // IndexedDBにデータがない場合 (破損など) はlocalStorageのIDも削除
          console.warn(`Draft data for ID ${lastId} not found in IndexedDB. Removing stale ID from localStorage.`);
          localStorage.removeItem('lastDraftId');
        }
        // draft.contentが空の場合は何もしない（復元する価値がない）
      } catch (error) {
        console.error("Error loading draft:", error);
        // エラーが発生した場合も、問題のあるIDをlocalStorageから削除する方が安全
        localStorage.removeItem('lastDraftId');
      }
    };

    // 少し遅延させて実行し、初期レンダリングとの競合を避ける
    const timerId = setTimeout(restoreDraft, 100);

    // クリーンアップ関数
    return () => clearTimeout(timerId);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // マウント時に一度だけ実行

  // --- Component Definitions ---

  // CodeMirror エディタコンポーネント
  const EditorComponent = useMemo(() => (
    <EmojiContextMenu onEmojiSelect={insertEmoji}>
      <CodeMirror
        value={markdownContent}
        height="100%" // 親要素の高さに追従
        extensions={editorExtensions}
        onChange={handleContentChange}
        theme={isDarkMode ? vscodeDark : xcodeLight} // 修正: xcodeLight を使用
        className={`text-md h-full ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`} // h-full を追加
        onCreateEditor={(view, state) => {
          viewRef.current = view;
          handleCursorUpdate(view); // 初期カーソル位置を取得
          // デバッグ用スタイル設定 (ここではコメントアウト)
          /* const styleId = 'codemirror-popup-hider'; ... */
        }}
      />
    </EmojiContextMenu>
  ), [markdownContent, editorExtensions, handleContentChange, isDarkMode, insertEmoji, handleCursorUpdate]); // 依存関係を整理

  // 標準Markdownプレビューコンポーネント
  const PreviewComponent = useMemo(() => (
    <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div ref={tabPreviewRef} className="markdown-preview p-4"> {/* ref は印刷用 */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = node?.position && node.position.start.line === node.position.end.line;

              if (match?.[1] === 'mermaid') {
                return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
              }
              if (isInline) {
                return <code className={className} {...props}>{children}</code>;
              }
              return (
                <div className="code-block-wrapper my-4 rounded-md overflow-hidden">
                  <div className={`code-language px-4 py-1 text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                    {match ? match[1] : 'code'}
                  </div>
                  <SyntaxHighlighter
                    language={match?.[1]}
                    PreTag="div"
                    style={isDarkMode ? vscDarkPlus as any : vscDarkPlus as any}
                    customStyle={isDarkMode ? { 
                      backgroundColor: '#000000', 
                      border: 'none',
                      borderRadius: '6px',
                      padding: '1em',
                      margin: '1em 0'
                    } : {}}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              );
            },
            // テーブルのスタイル調整
            table({ children }) {
              return <div className="overflow-x-auto"><table className="my-4 w-full">{children}</table></div>;
            },
            th({ children }) {
              return <th className={`p-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}>{children}</th>;
            },
            td({ children }) {
              return <td className={`p-2 border ${isDarkMode ? 'border-gray-700' : 'border-gray-600'}`}>{children}</td>;
            },
            // 他の要素も必要に応じて調整
            blockquote({ children }) {
              return <blockquote className={`border-l-4 pl-4 italic my-4 ${isDarkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>{children}</blockquote>
            }
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  ), [markdownContent, isDarkMode]); // tabPreviewRef は ref なので依存配列に含めない

  // Marp プレビューコンポーネント
  const MarpPreviewComponent = useMemo(() => (
    <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div ref={tabPreviewRef} className="markdown-preview p-4"> {/* ref は印刷用 */}
        <MarpPreview
          markdown={markdownContent}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  ), [markdownContent, isDarkMode]); // tabPreviewRef は ref なので依存配列に含めない

  // Quarto プレビューコンポーネント
  const QuartoPreviewComponent = useMemo(() => (
     <div className="quarto-preview-wrapper h-full overflow-auto"> {/* h-[calc(100vh-8rem)] は削除 */}
      <div ref={tabPreviewRef} className="markdown-preview h-full"> {/* ref は印刷用 */}
        <QuartoPreview
          markdown={markdownContent}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  ), [markdownContent, isDarkMode]); // tabPreviewRef は ref なので依存配列に含めない


  // --- Render ---
  return (
    <div className={`flex flex-col h-[calc(100vh-8rem)] ${isDarkMode ? 'bg-[#1e1e1e] text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* --- Top Bar --- */}
      <div className="flex justify-between items-center mb-2 pl-1 pr-2 py-2">
        <h1 className="text-xl font-bold">Markdown Editor</h1>
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            {/* Save Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSave} className="h-8 gap-1" disabled={isSaving || (driveEnabled && !isAuthenticated)}>
                  {isSaving ? <><span className="animate-spin mr-1">⌛</span><span className="hidden sm:inline">保存中...</span></> : <><Save className="h-4 w-4" /><span className="hidden sm:inline">Save</span></>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{driveEnabled && isAuthenticated ? `Google Driveに保存 (${selectedFile?.name || '新規'})` : "ローカルに保存"}</TooltipContent>
            </Tooltip>
            {/* Print Button */}
            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1"><Printer className="h-4 w-4" /><span className="hidden sm:inline">Print</span></Button></TooltipTrigger>
              <TooltipContent>Print Preview</TooltipContent>
            </Tooltip>
            {/* PPTX Export Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExportToPptx} className="h-8 gap-1" disabled={isPptxGenerating}>
                  {isPptxGenerating ? <><span className="animate-spin mr-1">⌛</span><span className="hidden sm:inline">変換中...</span></> : <><FileDown className="h-4 w-4" /><span className="hidden sm:inline">PPTX</span></>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>PowerPointとして出力 (PptxGenJS)</TooltipContent>
            </Tooltip>
            {/* Quarto PPTX Export Button */}
            <Tooltip>
               <TooltipTrigger asChild>
                 <Button variant="outline" size="sm" onClick={handleExportToQuartoPptx} className="h-8 gap-1" disabled={isQuartoPptxGenerating}>
                   {isQuartoPptxGenerating ? <><span className="animate-spin mr-1">⌛</span><span className="hidden sm:inline">変換中...</span></> : <><FileDown className="h-4 w-4" /><span className="hidden sm:inline">Q-PPTX</span></>}
                 </Button>
               </TooltipTrigger>
               <TooltipContent>QuartoでPowerPointとして出力</TooltipContent>
             </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* --- Toolbar --- */}
      <div className="bg-muted pl-1 pr-2 py-2 flex justify-start items-center mb-2 rounded-md">
        <TooltipProvider>
          <div className="flex space-x-0 items-center">
            {/* Headings */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("# ", "\n")}><Heading1 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Heading 1</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("## ", "\n")}><Heading2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Heading 2</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("### ", "\n")}><Heading3 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Heading 3</TooltipContent></Tooltip>
            </div>
            {/* Text Formatting */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("**", "**")}><Bold className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Bold</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("*", "*")}><Italic className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Italic</TooltipContent></Tooltip>
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Smile className="h-4 w-4" /></Button></PopoverTrigger>
                <PopoverContent className="w-80 p-0"><EmojiPicker onEmojiSelect={insertEmoji} /></PopoverContent>
              </Popover>
            </div>
            {/* Lists */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("- ", "\n")}><List className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Bullet List</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("1. ", "\n")}><ListOrdered className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Numbered List</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("- [ ] ", "\n")}><CheckSquare className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Task List</TooltipContent></Tooltip>
            </div>
            {/* Block Elements */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("> ", "\n")}><Quote className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Quote</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("```\n", "\n```")}><Code className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Code Block</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("|  |  |\n|--|--|\n|  |  |\n")}><Table className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Table</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("```mermaid\ngraph TD\n  A[開始] --> B[処理]\n  B --> C[終了]\n```\n")}><Box className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mermaid Diagram</TooltipContent></Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText(`---
marp: true
theme: default
${isDarkMode ? 'class: invert' : '# class: invert'}
paginate: true
header: "ヘッダ"
footer: "フッタ"
---

`, "")}><Presentation className="h-4 w-4" /></Button>
                </TooltipTrigger><TooltipContent>Marp Header</TooltipContent>
              </Tooltip>
              <Tooltip>
                 <TooltipTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText(`---
title: "Quarto Basics"
format:
  html:
    code-fold: true
jupyter: python3
---

`, "")}><FileCode className="h-4 w-4" /></Button>
                 </TooltipTrigger><TooltipContent>Quarto Header (HTML)</TooltipContent>
               </Tooltip>
            </div>
            {/* Links & Images & Clear */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("[", "](url)")}><Link className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Link</TooltipContent></Tooltip>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage}>{isUploadingImage ? <span className="animate-spin h-4 w-4">⌛</span> : <Image className="h-4 w-4" />}</Button></TooltipTrigger>
                <TooltipContent>Image</TooltipContent>
              </Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearContent}><Trash2 className="h-4 w-4 text-red-500" /></Button></TooltipTrigger><TooltipContent>Clear Editor</TooltipContent></Tooltip>
            </div>
            {/* View Mode */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
              <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'editor' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('editor')} className="h-8 w-8"><Code size={18} /></Button></TooltipTrigger><TooltipContent>Editor Only</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('preview')} className="h-8 w-8"><Box size={18} /></Button></TooltipTrigger><TooltipContent>Preview Only</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('split')} className="h-8 w-8"><SplitSquareVertical size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Markdown)</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'marp-preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('marp-preview')} className="h-8 w-8"><Presentation size={18} /></Button></TooltipTrigger><TooltipContent>Marp Preview</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'marp-split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('marp-split')} className="h-8 w-8"><Columns size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Marp)</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'quarto-preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('quarto-preview')} className="h-8 w-8"><FileChartColumn size={18} /></Button></TooltipTrigger><TooltipContent>Quarto Preview</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'quarto-split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('quarto-split')} className="h-8 w-8"><ChartColumn size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Quarto)</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'triple' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('triple')} className="h-8 w-8"><BotMessageSquare size={18} /></Button></TooltipTrigger><TooltipContent>AI Chat View</TooltipContent></Tooltip>
            </div>
            {/* Settings */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
               <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={toggleDarkMode} className="h-8 w-8">{isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent>{isDarkMode ? "Light Mode" : "Dark Mode"}</TooltipContent></Tooltip>
             </div>
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild><Button variant="outline" size="sm" onClick={toggleVimMode} className="h-8 gap-1"><Terminal className="h-4 w-4" /><span className="hidden sm:inline">{isVimMode ? "Vim:ON" : "Vim:OFF"}</span></Button></TooltipTrigger>
                <TooltipContent>{isVimMode ? "Disable Vim Mode" : "Enable Vim Mode"}</TooltipContent>
              </Tooltip>
            </div>
            {/* 目次表示ボタン ★追加 */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isTocVisible ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={toggleToc}
                    className="h-8 gap-1"
                    disabled={driveEnabled} // Google Drive有効時は無効化
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">{isTocVisible ? "Toc:ON" : "Toc:OFF"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isTocVisible ? "Hide Table of Contents" : "Show Table of Contents"}{driveEnabled ? " (Disabled when Google Drive is ON)" : ""}</TooltipContent>
              </Tooltip>
            </div>
            {/* Google Drive */}
            {process.env.NEXT_PUBLIC_GOOGLE_FLAG !== 'OFF' && (
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-md flex-shrink-0">
                <div className="text-sm mr-1 whitespace-nowrap">Google Drive</div>
                <Switch
                  checked={driveEnabled}
                  onCheckedChange={handleDriveToggle}
                  disabled={!isAuthenticated} // 非認証時は無効
                  aria-label="Toggle Google Drive integration"
                />
                <GoogleAuth onAuthChange={handleAuthChange} />
              </div>
            )}
            {/* Marpマニュアルボタン（一番右に配置） */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenMarpManual}
                    className="h-8 gap-1"
                  >
                    <span className="inline-flex items-center">💡Marp</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marpマニュアルを開く</TooltipContent>
              </Tooltip>
            </div>
            {/* Quartoマニュアルボタン */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenQuartoManual}
                    className="h-8 gap-1"
                  >
                    <span className="inline-flex items-center">💡Quarto</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quartoマニュアルを開く</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-grow overflow-hidden"> {/* Prevent content overflow */}
        {/* ビューモードに応じて表示を切り替え */}
        {viewMode === 'editor' && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* 左ペイン: Google Drive または 目次 */}
            {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
                  {driveEnabled && isAuthenticated && accessToken ? (
                    <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                  ) : (
                    <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                  )}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            ) : null}
            {/* エディタペイン */}
            <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 85 : 100}>
              <div className="h-full overflow-auto">{EditorComponent}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {viewMode === 'preview' && (
           <ResizablePanelGroup direction="horizontal" className="h-full">
             {/* 左ペイン: Google Drive または 目次 */}
             {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
                  {driveEnabled && isAuthenticated && accessToken ? (
                    <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                  ) : (
                    <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                  )}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            ) : null}
             {/* プレビューペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 85 : 100}>
               {PreviewComponent}
             </ResizablePanel>
           </ResizablePanelGroup>
         )}

         {viewMode === 'split' && (
           <ResizablePanelGroup direction="horizontal" className="h-full">
             {/* 左ペイン: Google Drive または 目次 */}
            {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
                  {driveEnabled && isAuthenticated && accessToken ? (
                    <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                  ) : (
                    <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                  )}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            ) : null}
             {/* エディタペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 42 : 50}>
               <div className="h-full overflow-auto">{EditorComponent}</div>
             </ResizablePanel>
             <ResizableHandle withHandle />
             {/* プレビューペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 43 : 50}>
               {PreviewComponent}
             </ResizablePanel>
           </ResizablePanelGroup>
         )}

         {viewMode === 'triple' && (
           <TripleLayout
             editorComponent={<div className="h-full overflow-auto">{EditorComponent}</div>}
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
             driveFileListComponent={driveEnabled && isAuthenticated && accessToken ? <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} /> : null}
             tocVisible={!driveEnabled && isTocVisible}
             tocComponent={
               (!driveEnabled && isTocVisible) ? 
               <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} /> 
               : null
             }
             getEditorContent={() => markdownContent}
             setInput={setInput}
             append={append as any}
           />
         )}

        {viewMode === 'marp-preview' && (
           <ResizablePanelGroup direction="horizontal" className="h-full">
             {/* 左ペイン: Google Drive または 目次 */}
            {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
                  {driveEnabled && isAuthenticated && accessToken ? (
                    <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                  ) : (
                    <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                  )}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            ) : null}
             {/* Marpプレビューペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 85 : 100}>
               {MarpPreviewComponent}
             </ResizablePanel>
           </ResizablePanelGroup>
         )}

         {viewMode === 'marp-split' && (
           <ResizablePanelGroup direction="horizontal" className="h-full">
             {/* 左ペイン: Google Drive または 目次 */}
            {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
                  {driveEnabled && isAuthenticated && accessToken ? (
                    <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                  ) : (
                    <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                  )}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            ) : null}
             {/* エディタペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 42 : 50}>
               <div className="h-full overflow-auto">{EditorComponent}</div>
             </ResizablePanel>
             <ResizableHandle withHandle />
             {/* Marpプレビューペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 43 : 50}>
               {MarpPreviewComponent}
             </ResizablePanel>
           </ResizablePanelGroup>
         )}

         {viewMode === 'quarto-preview' && (
           <ResizablePanelGroup direction="horizontal" className="h-full">
             {/* 左ペイン: Google Drive または 目次 */}
            {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
                  {driveEnabled && isAuthenticated && accessToken ? (
                    <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                  ) : (
                    <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                  )}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            ) : null}
             {/* Quartoプレビューペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 85 : 100}>
               {QuartoPreviewComponent}
             </ResizablePanel>
           </ResizablePanelGroup>
         )}

         {viewMode === 'quarto-split' && (
           <ResizablePanelGroup direction="horizontal" className="h-full">
             {/* 左ペイン: Google Drive または 目次 */}
            {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
                  {driveEnabled && isAuthenticated && accessToken ? (
                    <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                  ) : (
                    <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                  )}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            ) : null}
             {/* エディタペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 42 : 50}>
               <div className="h-full overflow-auto">{EditorComponent}</div>
             </ResizablePanel>
             <ResizableHandle withHandle />
             {/* Quartoプレビューペイン */}
             <ResizablePanel defaultSize={(driveEnabled && isAuthenticated) || (!driveEnabled && isTocVisible) ? 43 : 50}>
               {QuartoPreviewComponent}
             </ResizablePanel>
           </ResizablePanelGroup>
         )}
      </div>

      {/* --- Status Bar --- */}
      <div className={`p-1 border-t text-xs flex justify-between items-center shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
        <div>Ln {cursorPosition.line}, Col {cursorPosition.col}</div>
        <div>
          {getPreviewModeName() && <span>Preview: {getPreviewModeName()}</span>}
          {isVimMode && <span className="ml-2 font-bold text-green-500">VIM</span>}
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
    </div>
  )
}

