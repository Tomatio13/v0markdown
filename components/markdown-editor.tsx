"use client"

// SpeechRecognition 関連の型定義
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

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Bold, Italic, List, ListOrdered, Quote, Code, Link, Image, Save, Printer, Heading1, Heading2, Heading3, Table, CheckSquare, Moon, Sun, Smile, Box, MessageSquare, SplitSquareVertical, Trash2, Terminal, Upload, Presentation, Columns, FileDown, FileCode, BotMessageSquare, FileChartColumn, ChartColumn, FileText, Tv, FileBox, UserCheck, UserX, Settings2, LogOut, UploadCloud, DownloadCloud, ExternalLink, CircleHelp, File as FileIcon, Mic // Micアイコンを追加
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
import { load } from "js-yaml";      // ★ 追加：YAML パーサ
import { type LoadOptions } from 'js-yaml'; // YamlLoadOptions -> LoadOptions に修正

// --- グローバル型定義 ---
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
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
  // --- ▼ ADDED ▼ ---
  // 出力モードの状態を追加 (markdown, marp, quarto)
  const [outputMode, setOutputMode] = useState<'markdown' | 'marp' | 'quarto'>('markdown')
  // --- ▲ ADDED ▲ ---
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split' | 'triple' | 'marp-preview' | 'marp-split' | 'quarto-preview' | 'quarto-split'>('split')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isPptxGenerating, setIsPptxGenerating] = useState(false)
  const [isQuartoPptxGenerating, setIsQuartoPptxGenerating] = useState(false)
  const [isQuartoPdfGenerating, setIsQuartoPdfGenerating] = useState(false); // PDF生成用のローディング状態を追加
  const [isTocVisible, setIsTocVisible] = useState(false);

  // Google Drive State
  const [driveEnabled, setDriveEnabled] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<GoogleFile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // AI Chat State (using useChat hook)
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput, append, reload, stop } = useChat();

  // 音声入力関連のステート
  const [isListening, setIsListening] = useState(false)
  const [recognizedText, setRecognizedText] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // --- Refs ---
  const viewRef = useRef<EditorView | null>(null)
  const cursorPosRef = useRef<number>(0)
  const splitPreviewRef = useRef<HTMLDivElement>(null)
  const tabPreviewRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Derived State ---
  const extractedHeadings = useMemo(() => {
    // ... (ここは変更なし) ...
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
  const handleContentChange = useCallback((value: string) => {
    setMarkdownContent(value)
  }, [])

  const handleCursorUpdate = useCallback((view: EditorView | null) => {
    // ... (ここは変更なし) ...
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

  const editorExtensions = useMemo(() => {
    // ... (ここは変更なし) ...
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
  const insertText = useCallback((before: string, after = "") => {
    // ... (ここは変更なし) ...
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
  }, [setMarkdownContent]);

  const insertEmoji = useCallback((emoji: string) => {
    // ... (ここは変更なし) ...
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
  }, [setMarkdownContent]);

  const handleAIContentInsert = useCallback((text: string) => {
    // ... (ここは変更なし) ...
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
  }, [setMarkdownContent]); // 依存配列: viewRef は含めず、安定した setMarkdownContent を追加

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (ここは変更なし) ...
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
  }, [setMarkdownContent]);

  const handleClearContent = useCallback(() => {
    // ... (ここは変更なし) ...
     setMarkdownContent("");
    cursorPosRef.current = 0;
    if (viewRef.current) {
      viewRef.current.focus();
    }
  }, [setMarkdownContent]);

  const toggleVimMode = useCallback(() => {
    // ... (ここは変更なし) ...
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
  }, [setIsVimMode]);

  const toggleToc = useCallback(() => {
    setIsTocVisible(prev => !prev);
  }, [setIsTocVisible]);

  // --- ▼ MOVED/REMOVED ▼ ---
  // マニュアル表示ハンドラは不要になるか、別の場所に移動
  // const handleOpenMarpManual = useCallback(() => { ... });
  // const handleOpenQuartoManual = useCallback(() => { ... });
  // --- ▲ MOVED/REMOVED ▲ ---

  const handleTocJump = useCallback((lineNumber: number) => {
    // ... (ここは変更なし) ...
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
  }, []);

  // --- File & Export Handlers ---
  const generateFileName = (content: string, defaultExt: string = 'md'): string => {
    // ... (ここは変更なし) ...
     const firstLine = content.split('\n')[0] || '';
    let baseName = firstLine.replace(/^#+\s*/, '').trim();
    baseName = baseName.replace(/\s+/g, '_'); // スペースをアンダースコアに
    baseName = baseName.replace(/[\\/:*?"<>|]/g, '_'); // ファイル名に使えない文字を置換
    const potentialFileName = baseName ? `${baseName}.${defaultExt}` : '';
    return potentialFileName || `untitled-${uuidv4().substring(0, 8)}.${defaultExt}`;
  };

  const handleDriveSave = useCallback(async () => {
    // ... (ここは変更なし) ...
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
  }, [accessToken, markdownContent, selectedFile, setSelectedFile]);

  const handleLocalSave = async () => {
    // ... (ここは変更なし) ...
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

  const handleSave = useCallback(async () => {
    // ... (ここは変更なし) ...
     if (driveEnabled && isAuthenticated && accessToken) {
      await handleDriveSave();
    } else {
      await handleLocalSave();
    }
  }, [driveEnabled, isAuthenticated, accessToken, handleDriveSave, handleLocalSave]);

  const handlePrint = () => {
     // コメントアウトされていた部分を元に戻す
     const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const activePreviewElement =
      document.querySelector('.tabs-content[data-state="active"] .prose') ||
      document.querySelector('.markdown-preview .prose') || // Improve selector
      splitPreviewRef.current ||
      tabPreviewRef.current;

    const currentPreviewContent = activePreviewElement?.innerHTML || "プレビューコンテンツが見つかりません。";

    // HTMLコンテンツの生成 (CSS修正済み)
    const htmlContent = `
    <!DOCTYPE html><html><head><title>Markdown Preview</title><style>
    body{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;line-height:1.6;color:#333;max-width:800px;margin:0 auto;padding:20px;}
    pre{background-color:#1E1E1E;border-radius:3px;padding:16px;overflow:auto;color:#D4D4D4;}
    pre code{font-family:SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;background:none;padding:0;color:inherit;}
    code:not(pre > code){font-family:SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;background-color:rgba(27,31,35,.05);padding:.2em .4em;margin:0;font-size:85%;border-radius:3px;}
    .token.comment{color:#6A9955;}.token.string{color:#CE9178;}.token.keyword{color:#569CD6;}.token.function{color:#DCDCAA;}.token.number{color:#B5CEA8;}.token.operator{color:#D4D4D4;}.token.class-name{color:#4EC9B0;}
    table{border-collapse:collapse;width:100%;margin-bottom:16px;border-spacing:0;}
    table th, table td{border:1px solid #ddd;padding:8px 12px;text-align:left;}
    /* Remove the background color for even rows */
    /* table tr:nth-child(even){background-color:#f6f8fa;} */
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
    /* Marp/Quarto 用のスタイル */
    .marp-preview-slide, .quarto-slide {
       border: 1px solid #ccc;
       margin-bottom: 1em;
    }
    /* YAML preview table specific styles for print */
    .yaml-preview table { border: 1px solid #ddd !important; }
    .yaml-preview th, .yaml-preview td { background-color: transparent !important; border: 1px solid #ddd !important; }
    .yaml-preview th { background-color: #f8f9fa !important; color: #333 !important; }
    .yaml-preview ul { list-style: disc !important; padding-left: 20px !important; margin-left: 0 !important; }
    .yaml-preview li { margin-bottom: 4px; }
    </style></head><body><div id="content">${currentPreviewContent}</div>
    <script>window.onload=function(){console.log('Content loaded, triggering print...');window.print();/* setTimeout(() => { window.close(); }, 500); */}</script>
    </body></html>`;

    // 印刷ウィンドウに書き込み
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportToPptx = async () => {
    // ... (ここは変更なし、ただし後で handleExport に統合) ...
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

  const handleExportToQuartoPptx = async () => {
    // ... (ここは変更なし、ただし後で handleExport に統合) ...
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

  // Quarto PDF出力ハンドラを追加
  const handleExportToQuartoPdf = async () => {
    console.log('Quarto PDF変換処理を開始します...');
    setIsQuartoPdfGenerating(true);
    try {
      if (!markdownContent.trim()) {
        alert('マークダウンコンテンツが空です。'); return;
      }
      const formData = new FormData();
      formData.append('markdown', markdownContent);
      formData.append('format', 'pdf'); // Quarto APIにPDFフォーマットを指定
      const response = await fetch('/api/export-to-quarto', { method: 'POST', body: formData });

      if (!response.ok) {
        let errorMessage = 'Quarto PDF変換エラー';
        try { const errorData = await response.json(); errorMessage = errorData.error || errorMessage; }
        catch (e) { const errorText = await response.text(); errorMessage = errorText || errorMessage; }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const jsonData = await response.json(); throw new Error(jsonData.error || 'Quarto PDF変換エラー');
      }
      if (!contentType?.includes('application/pdf')) {
        console.warn('Expected PDF response, but received:', contentType);
        // PDFでない場合は、テキストとしてエラーメッセージを表示しようと試みる
        const errorText = await response.text();
        throw new Error(errorText || 'サーバーから予期しない応答がありました。');
      }
      if (response.headers.get('X-Processing-Time')) console.log(`サーバー処理時間: ${response.headers.get('X-Processing-Time')}`);


      const pdfBlob = await response.blob();
      if (pdfBlob.size === 0) throw new Error('生成されたPDFファイルが空です');

      const fileName = generateFileName(markdownContent, 'pdf');
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a'); a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 100);
      console.log('Quarto PDFファイルが正常に生成されました');
    } catch (error) {
      console.error('Quarto PDF変換エラー詳細:', error);
      alert(error instanceof Error ? error.message : 'PDF変換中に不明なエラーが発生しました');
    } finally {
      setIsQuartoPdfGenerating(false);
    }
  };

  // --- ▼ ADDED ▼ ---
  // 統合エクスポートハンドラ
  const handleExport = useCallback(async () => {
    // ... (変更なし) ...
    switch (outputMode) {
      case 'markdown':
        handlePrint();
        break;
      case 'marp':
        await handleExportToPptx();
        break;
      case 'quarto':
        // Quartoモードの既存のExportボタンはPPTX出力とする
        await handleExportToQuartoPptx();
        break;
      default:
        console.warn(`Unsupported output mode for export: ${outputMode}`);
    }
  }, [outputMode, handlePrint, handleExportToPptx, handleExportToQuartoPptx]); // 依存関係を修正

  // Exportボタンのツールチップとアイコンを動的に取得
  const getExportButtonProps = () => {
    // ... (変更なし) ...
    switch (outputMode) {
      case 'markdown':
        return { tooltip: "印刷プレビュー", icon: <Printer className="h-4 w-4" />, label: "Print" }; // ラベルをPrintに変更
      case 'marp':
        return { tooltip: "PowerPointとして出力 (Marp)", icon: <FileDown className="h-4 w-4" />, label: "PPTX" }; // ラベルを具体的に
      case 'quarto':
        // Quartoモードの既存ExportボタンはPPTX用とする
        return { tooltip: "PowerPointとして出力 (Quarto)", icon: <FileDown className="h-4 w-4" />, label: "PPTX" }; // ラベルを具体的に
      default:
        return { tooltip: "エクスポート", icon: <DownloadCloud className="h-4 w-4" />, label: "Export" }; // Fallback
    }
  };

  // Exportボタンのローディング状態を判定
  const isExporting = useMemo(() => {
    // ... (変更なし) ...
    switch (outputMode) {
      case 'marp': return isPptxGenerating;
      case 'quarto': return isQuartoPptxGenerating; // PPTX生成状態を見る
      default: return false; // MarkdownのPrintは非同期ではない
    }
  }, [outputMode, isPptxGenerating, isQuartoPptxGenerating]);
  // --- ▲ ADDED ▲ ---

  // --- Google Drive Handlers ---
  const handleAuthChange = useCallback((authenticated: boolean, token?: string) => {
    // ... (ここは変更なし) ...
     setIsAuthenticated(authenticated);
    setAccessToken(token || null);
    if (!authenticated) {
      setSelectedFile(null); // Logout clears selection
      setDriveEnabled(false); // Logout disables Drive integration
    }
  }, []);

  const handleDriveToggle = useCallback((enabled: boolean) => {
    // ... (ここは変更なし) ...
     if (enabled && !isAuthenticated) {
       alert("Google Driveにログインしてください。");
       return;
    }
    setDriveEnabled(enabled);
    if (!enabled) {
      setSelectedFile(null);
    }
  }, [isAuthenticated]);

  const handleFileSelect = useCallback(async (file: GoogleFile) => {
    // ... (ここは変更なし) ...
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
  }, [accessToken, setMarkdownContent]);

  // --- AI Chat Handlers ---
  const clearMessages = useCallback(() => {
    // ... (ここは変更なし) ...
     setMessages([]);
  }, [setMessages]);

  // ★★★ 追加：エディタ内容取得関数をメモ化 ★★★
  const getEditorContentCallback = useCallback((): string => {
    return viewRef.current?.state.doc.toString() ?? markdownContent;
  }, [markdownContent]); // markdownContentを依存配列に追加

  // --- UI Handlers ---
  const toggleDarkMode = () => {
    // ... (ここは変更なし) ...
     setIsDarkMode(prev => {
      const newMode = !prev;
      document.documentElement.classList.toggle('dark', newMode);
      return newMode;
    });
  };

  // --- ▼ ADDED ▼ ---
  // サイドバーでのモード切替ハンドラ
  const handleModeChange = useCallback((newMode: 'markdown' | 'marp' | 'quarto') => {
    setOutputMode(newMode);
    // viewMode も連動して切り替える (Splitをデフォルトにする)
    switch (newMode) {
      case 'markdown':
        setViewMode('split');
        break;
      case 'marp':
        setViewMode('marp-split');
        break;
      case 'quarto':
        setViewMode('quarto-split');
        break;
    }
  }, [setOutputMode, setViewMode]);
  // --- ▲ ADDED ▲ ---

  // プレビューモード名取得ヘルパー (変更なし)
  const getPreviewModeName = () => {
    if (viewMode.includes('marp')) return 'Marp';
    if (viewMode.includes('quarto')) return 'Quarto';
    if (viewMode.includes('preview') || viewMode.includes('split')) return 'Markdown';
    return null;
  };

  // --- Effects ---
  useEffect(() => {
    // ... (初期フォーカス、変更なし) ...
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
  }, [handleCursorUpdate]);

  useAutoSave({ content: markdownContent, fileId: selectedFile?.id });

  useEffect(() => {
    // ... (ドラフト復元、変更なし) ...
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
  }, []);

  // --- 音声入力の関数 ---
  const startSpeechRecognition = useCallback(() => {
    // Web Speech APIのサポートチェック
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('このブラウザは音声認識をサポートしていません');
      alert('このブラウザは音声認識をサポートしていません。Chrome、Edge、Safariの最新版をお試しください。');
      return;
    }

    // SpeechRecognitionの初期化
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    // 設定
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP'; // 日本語に設定（変更可能）

    // イベントハンドラー
    recognition.onstart = () => {
      setIsListening(true);
      setRecognizedText("");
      console.log('音声認識開始');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        // スペースを削除またはトリムして取得
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // 認識された文字列を表示
      setRecognizedText(interimTranscript || finalTranscript);

      // 確定した文字列をエディタに挿入
      if (finalTranscript) {
        // 最終テキストは空白をトリムして挿入
        insertTextAtCursor(finalTranscript.trim());
        // 行末に移動して改行を追加
        insertNewlineAtLineEnd();
        setRecognizedText("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('音声認識エラー:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('音声認識終了');
      setIsListening(false);
      setRecognizedText("");
    };

    // 認識開始
    recognition.start();
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setRecognizedText("");
  }, []);

  const toggleSpeechRecognition = useCallback(() => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  }, [isListening, startSpeechRecognition, stopSpeechRecognition]);

  // カーソル位置にテキストを挿入する関数
  const insertTextAtCursor = useCallback((text: string) => {
    if (viewRef.current) {
      const view = viewRef.current;
      const pos = view.state.selection.main.head;
      const transaction = view.state.update({
        changes: { from: pos, insert: text }
      });
      view.dispatch(transaction);
    }
  }, []);

  // 行末に改行を追加する関数
  const insertNewlineAtLineEnd = useCallback(() => {
    if (viewRef.current) {
      const view = viewRef.current;
      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      const lineEndPos = line.to;
      
      // 行末に改行を挿入し、その後のカーソル位置を改行後に設定
      const transaction = view.state.update({
        changes: { from: lineEndPos, insert: '\n' },
        selection: { anchor: lineEndPos + 1, head: lineEndPos + 1 }
      });
      view.dispatch(transaction);
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // --- Component Definitions ---
  const EditorComponent = useMemo(() => (
    // ... (変更なし) ...
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
  ), [markdownContent, editorExtensions, handleContentChange, isDarkMode, insertEmoji, handleCursorUpdate]);

  const PreviewComponent = useMemo(() => (
    // ... (PreviewComponent の定義を useMemo の外に出すことを検討したが、依存関係が多いため、現状維持)
    <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div ref={tabPreviewRef} className="markdown-preview p-4"> {/* ref は印刷用 */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}
          components={{
            // code レンダラーをここに配置
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match?.[1]; 
              const isInline = node?.position && node.position.start.line === node.position.end.line;
              const codeContent = String(children).replace(/\n$/, '');

              // 既存の Mermaid 処理
              if (language === 'mermaid') {
                if (outputMode === 'markdown') {
                    return <MermaidDiagram chart={codeContent} />;
                } else {
                    return (
                      <div className="code-block-wrapper my-4 rounded-md overflow-hidden">
                        <div className={`code-language px-4 py-1 text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                          mermaid
                        </div>
                        <SyntaxHighlighter
                          language={'mermaid'}
                          PreTag="div"
                          style={isDarkMode ? vscDarkPlus as any : oneLight as any} 
                          customStyle={{ /* 既存のスタイル */ }}
                        >
                          {codeContent}
                        </SyntaxHighlighter>
                      </div>
                    );
                }
              }

              // YAML Preview Logic
              if (language === "yaml" && !isInline) {
                const renderYamlValue = (value: any): React.ReactNode => {
                  if ( value === null || ["string", "number", "boolean"].includes(typeof value)) {
                    return <span>{String(value)}</span>;
                  }
                  if (Array.isArray(value)) {
                    if (value.length && value.every( (v) => v && typeof v === "object" && !Array.isArray(v) )) {
                      const headers = Array.from( new Set(value.flatMap((v) => Object.keys(v))) );
                      return (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className={isDarkMode ? "bg-gray-700" : "bg-gray-100"}>
                            <tr>
                              {headers.map((h) => ( <th key={h} className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${ isDarkMode ? "text-gray-300" : "text-gray-500" }`} > {h} </th> ))}
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${ isDarkMode ? "bg-gray-800 divide-gray-700" : "bg-white divide-gray-200" }`} >
                            {value.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {headers.map((h) => ( <td key={h} className={`px-4 py-2 whitespace-nowrap text-sm ${ isDarkMode ? "text-gray-300" : "text-gray-900" }`} > {renderYamlValue((row as any)?.[h] ?? '')} </td> ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    }
                    return ( <ul className="list-disc pl-4"> {value.map((v, i) => ( <li key={i}>{renderYamlValue(v)}</li> ))} </ul> );
                  }
                  if (typeof value === 'object' && value !== null) {
                      return (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <tbody className={`divide-y ${ isDarkMode ? "bg-gray-800 divide-gray-700" : "bg-white divide-gray-200" }`} >
                            {Object.entries(value).map(([k, v]) => (
                              <tr key={k}>
                                <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${ isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-500" }`} scope="row" > {k} </th>
                                <td className={`px-4 py-2 whitespace-nowrap text-sm ${ isDarkMode ? "text-gray-300" : "text-gray-900" }`} > {renderYamlValue(v)} </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                  }
                  return <span>{String(value)}</span>;
                };
                try {
                  const yamlData = load(codeContent, { json: true } as LoadOptions);
                  if (yamlData === undefined || yamlData === null) {
                      return <span className="text-gray-500 italic">(empty YAML)</span>;
                  }
                  return ( <div className={`yaml-preview my-4 overflow-x-auto border rounded ${ isDarkMode ? "border-gray-600" : "border-gray-300" }`} > {renderYamlValue(yamlData)} </div> );
                } catch (err: any) {
                  console.error("YAML Parse Error:", err);
                  return (
                    <>
                      <div className="yaml-parse-error my-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded">
                        <strong>YAML Parse Error:</strong>{" "}
                        {err.message || "Invalid YAML"}
                      </div>
                      <div className="code-block-wrapper my-4 rounded-md overflow-hidden">
                        <div className={`code-language px-4 py-1 text-xs ${ isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700" }`} > yaml </div>
                        <SyntaxHighlighter language="yaml" PreTag="div" style={isDarkMode ? vscDarkPlus as any : oneLight as any} customStyle={{ /* 既存のスタイル */ }} > {codeContent} </SyntaxHighlighter>
                      </div>
                    </>
                  );
                }
              }

              // インラインコード
              if (isInline) {
                return <code className={className} {...props}>{children}</code>;
              }

              // 通常のコードブロックハイライト (YAML/Mermaid以外)
              return (
                <div className="code-block-wrapper my-4 rounded-md overflow-hidden">
                  <div className={`code-language px-4 py-1 text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                    {language || 'code'} 
                  </div>
                  <SyntaxHighlighter
                    language={language} // 修正: language 変数を渡す
                    PreTag="div"
                    style={isDarkMode ? vscDarkPlus as any : oneLight as any} 
                    customStyle={{ /* 既存のスタイル */ }}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                </div>
              );
            },
            // 他のコンポーネント (table, th, td, blockquote) は変更なし
            table({ children }) {
              return <div className="overflow-x-auto"><table className="my-4 w-full">{children}</table></div>;
            },
            th({ children }) {
              return <th className={`p-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}>{children}</th>;
            },
            td({ children }) {
              return <td className={`p-2 border ${isDarkMode ? 'border-gray-700' : 'border-gray-600'}`}>{children}</td>;
            },
            blockquote({ children }) {
              return <blockquote className={`border-l-4 pl-4 italic my-4 ${isDarkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-600'}`}>{children}</blockquote>
            }
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  ), [markdownContent, isDarkMode, outputMode]); // 依存配列を修正

  const MarpPreviewComponent = useMemo(() => (
    // ... (変更なし) ...
     <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div ref={tabPreviewRef} className="markdown-preview p-4"> {/* ref は印刷用 */}
        <MarpPreview
          markdown={markdownContent}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  ), [markdownContent, isDarkMode]);

  const QuartoPreviewComponent = useMemo(() => (
    // ... (変更なし) ...
      <div className="quarto-preview-wrapper h-full overflow-auto"> 
      <div ref={tabPreviewRef} className="markdown-preview h-full"> 
        <QuartoPreview
          markdown={markdownContent}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  ), [markdownContent, isDarkMode]);

  // --- ▼ ADDED ▼ ---
  // ツールバーボタンの表示/非表示を決定するヘルパー
  const showToolbarButton = (buttonName: string): boolean => {
    // 常に表示するボタン
    if (buttonName === 'VoiceInput') {
      return true;
    }
    
    switch (outputMode) {
      case 'markdown':
        // MarkdownモードではMarp/Quarto関連ヘッダとマニュアルボタンを非表示
        return !['Marp Header', 'Quatro Header', '💡Marp', '💡Quatro'].includes(buttonName);
      case 'marp':
        // MarpモードではMermaid、Quartoヘッダ、Quartoマニュアルを非表示
        return !['Mermaid', 'Quatro Header', '💡Quatro'].includes(buttonName);
      case 'quarto':
        // QuartoモードではMermaid、Marpヘッダ、Marpマニュアルを非表示
        return !['Mermaid', 'Marp Header', '💡Marp'].includes(buttonName); // 💡Quatro を表示許可
      default:
        return false;
    }
  };
  // --- ▲ ADDED ▲ ---

  // --- Render ---
  return (
    <div className={`fixed inset-0 flex ${isDarkMode ? 'bg-[#1e1e1e] text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* --- Sidebar --- */}
      <div className={`w-16 flex flex-col items-center py-4 space-y-4 border-r ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
        <TooltipProvider>
          {/* Mode Buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={outputMode === 'markdown' ? 'secondary' : 'ghost'} size="icon" className="h-10 w-10" onClick={() => handleModeChange('markdown')}>
                <FileText className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Markdown Mode</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={outputMode === 'marp' ? 'secondary' : 'ghost'} size="icon" className="h-10 w-10" onClick={() => handleModeChange('marp')}>
                <Presentation className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Marp Mode</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={outputMode === 'quarto' ? 'secondary' : 'ghost'} size="icon" className="h-10 w-10" onClick={() => handleModeChange('quarto')}>
                <FileChartColumn className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Quarto Mode</TooltipContent>
          </Tooltip>

          <div className="w-full border-t my-2"></div>

          {/* Google Login/Status */}
          {process.env.NEXT_PUBLIC_GOOGLE_FLAG !== 'OFF' && (
            // --- ▼ MODIFIED ▼ ---
            // GoogleAuth を TooltipTrigger の子として直接配置し、
            // isAuthenticated 状態に応じたアイコンを GoogleAuth の子要素として渡す試み -> GoogleAuth内部でアイコンを出すように変更したので、元の呼び出し方に戻す
            <Tooltip>
              <TooltipTrigger asChild>
                 {/* GoogleAuth を直接配置。アイコン表示は GoogleAuth 内部で行う */}
                 <GoogleAuth onAuthChange={handleAuthChange} />
              </TooltipTrigger>
              {/* ツールチップの内容も認証状態に応じて変更 */} 
              <TooltipContent side="right">{isAuthenticated ? "Googleからログアウト" : "Googleにログイン"}</TooltipContent>
            </Tooltip>
            // --- ▲ MODIFIED ▲ ---
          )}

          {/* Dark Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-10 w-10">
                {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{isDarkMode ? "ライトモードに切替" : "ダークモードに切替"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex flex-col flex-grow overflow-hidden">
        {/* --- Menu Bar (Top) --- */}
        <div className={`flex justify-between items-center px-4 py-2 border-b shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
          <h1 className="text-lg font-semibold">Markdown Editor</h1>
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

              {/* --- ▼ ADDED ▼ --- */}
              {/* Quarto PDF Export Button (Conditional) */}
              {outputMode === 'quarto' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleExportToQuartoPdf} className="h-8 gap-1" disabled={isQuartoPdfGenerating}>
                      {/* --- ▼ MODIFIED ▼ --- */}
                      {/* File を FileIcon に変更 */}
                      {isQuartoPdfGenerating ? <><span className="animate-spin mr-1">⌛</span><span className="hidden sm:inline">生成中...</span></> : <><FileIcon className="h-4 w-4" /><span className="hidden sm:inline">PDF</span></>}
                      {/* --- ▲ MODIFIED ▲ --- */}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>PDFとして出力 (Quarto)</TooltipContent>
                </Tooltip>
              )}
              {/* --- ▲ ADDED ▲ --- */}

              {/* Export Button (Dynamic: PPTX/Print) */}
              {/* Markdownモードでは印刷、Marp/QuartoモードではPPTX出力 */}
              {(outputMode === 'markdown' || outputMode === 'marp' || outputMode === 'quarto') && ( // 表示条件を確認
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleExport} className="h-8 gap-1" disabled={isExporting}>
                        {isExporting ? <><span className="animate-spin mr-1">⌛</span><span className="hidden sm:inline">処理中...</span></> : <>{getExportButtonProps().icon}<span className="hidden sm:inline">{getExportButtonProps().label}</span></>}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{getExportButtonProps().tooltip}</TooltipContent>
                  </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        {/* --- Toolbar --- */}
        <div className={`bg-muted pl-1 pr-2 py-1 flex justify-start items-center border-b shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} overflow-x-auto whitespace-nowrap`}>
          <TooltipProvider>
            <div className="flex space-x-0 items-center">
              {/* Headings */}
              {showToolbarButton('H1') && <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("# ", "\n")}><Heading1 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Heading 1</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("## ", "\n")}><Heading2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Heading 2</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("### ", "\n")}><Heading3 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Heading 3</TooltipContent></Tooltip>
              </div>}
              {/* Text Formatting */}
              {(showToolbarButton('Bold') || showToolbarButton('Italic') || showToolbarButton('Emoji')) && <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
                {showToolbarButton('Bold') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("**", "**")}><Bold className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Bold</TooltipContent></Tooltip>}
                {showToolbarButton('Italic') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("*", "*")}><Italic className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Italic</TooltipContent></Tooltip>}
                {showToolbarButton('Emoji') && <Popover>
                  <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Smile className="h-4 w-4" /></Button></PopoverTrigger>
                  <PopoverContent className="w-80 p-0"><EmojiPicker onEmojiSelect={insertEmoji} /></PopoverContent>
                </Popover>}
              </div>}
              {/* Lists */}
              {(showToolbarButton('Bullet List') || showToolbarButton('Numberd List') || showToolbarButton('Task List')) && <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
                {showToolbarButton('Bullet List') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("- ", "\n")}><List className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Bullet List</TooltipContent></Tooltip>}
                {showToolbarButton('Numberd List') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("1. ", "\n")}><ListOrdered className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Numbered List</TooltipContent></Tooltip>}
                {showToolbarButton('Task List') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("- [ ] ", "\n")}><CheckSquare className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Task List</TooltipContent></Tooltip>}
              </div>}
              {/* Block Elements */}
              {(showToolbarButton('Quato') || showToolbarButton('Code Block') || showToolbarButton('Table') || showToolbarButton('Mermaid') || showToolbarButton('Marp Header') || showToolbarButton('Quatro Header')) && <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
                {showToolbarButton('Quato') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("> ", "\n")}><Quote className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Quote</TooltipContent></Tooltip>}
                {showToolbarButton('Code Block') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("```\n", "\n```")}><Code className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Code Block</TooltipContent></Tooltip>}
                {showToolbarButton('Table') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("|  |  |\n|--|--|\n|  |  |\n")}><Table className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Table</TooltipContent></Tooltip>}
                {showToolbarButton('Mermaid') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("```mermaid\ngraph TD\n  A[開始] --> B[処理]\n  B --> C[終了]\n```\n")}><Box className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mermaid Diagram</TooltipContent></Tooltip>}
                {showToolbarButton('Marp Header') && <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText(`---\nmarp: true\ntheme: default\n${isDarkMode ? 'class: invert' : '# class: invert'}\npaginate: true\nheader: "Header"\nfooter: "Footer"\n---\n\n`, "")}><Presentation className="h-4 w-4" /></Button>
                  </TooltipTrigger><TooltipContent>Marp Header</TooltipContent>
                </Tooltip>}
                {showToolbarButton('Quatro Header') && <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText(`---\ntitle: "Quarto Basics"\nformat:\n html:\n  code-fold: true\njupter: python3\n---\n\n`, "")}><FileCode className="h-4 w-4" /></Button>
                  </TooltipTrigger><TooltipContent>Quarto Header</TooltipContent>
                </Tooltip>}
              </div>}
              {/* Links & Images & Clear */}
              {(showToolbarButton('Link') || showToolbarButton('Image') || showToolbarButton('Clear Editor')) && <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
                {showToolbarButton('Link') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertText("[", "](url)")}><Link className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Link</TooltipContent></Tooltip>}
                {showToolbarButton('Image') && <Tooltip>
                  <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage}>{isUploadingImage ? <span className="animate-spin h-4 w-4">⌛</span> : <Image className="h-4 w-4" />}</Button></TooltipTrigger>
                  <TooltipContent>Image</TooltipContent>
                </Tooltip>}
                {showToolbarButton('Clear Editor') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearContent}><Trash2 className="h-4 w-4 text-red-500" /></Button></TooltipTrigger><TooltipContent>Clear Editor</TooltipContent></Tooltip>}
              </div>}
              {/* View Mode Buttons */}
              <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
                <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'editor' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('editor')} className="h-8 w-8"><Code size={18} /></Button></TooltipTrigger><TooltipContent>Editor Only</TooltipContent></Tooltip>
                {outputMode === 'markdown' && (
                  <>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('preview')} className="h-8 w-8"><Box size={18} /></Button></TooltipTrigger><TooltipContent>Preview Only</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('split')} className="h-8 w-8"><SplitSquareVertical size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Markdown)</TooltipContent></Tooltip>
                  </>
                )}
                {outputMode === 'marp' && (
                  <>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'marp-preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('marp-preview')} className="h-8 w-8"><Presentation size={18} /></Button></TooltipTrigger><TooltipContent>Marp Preview</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'marp-split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('marp-split')} className="h-8 w-8"><Columns size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Marp)</TooltipContent></Tooltip>
                  </>
                )}
                {outputMode === 'quarto' && (
                  <>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'quarto-preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('quarto-preview')} className="h-8 w-8"><FileChartColumn size={18} /></Button></TooltipTrigger><TooltipContent>Quarto Preview</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'quarto-split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('quarto-split')} className="h-8 w-8"><ChartColumn size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Quarto)</TooltipContent></Tooltip>
                  </>
                )}
                {showToolbarButton('AI Chat View') && <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'triple' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('triple')} className="h-8 w-8"><BotMessageSquare size={18} /></Button></TooltipTrigger><TooltipContent>AI Chat View</TooltipContent></Tooltip>}
              </div>
              {/* Settings & Drive & Manuals */}
              {/* --- ▼ MODIFIED ▼ --- */}
              {/* マニュアルボタンの条件分岐を修正 */}
              <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-md mr-1 flex-shrink-0">
                {/* 音声入力ボタン */}
                {showToolbarButton('VoiceInput') && 
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSpeechRecognition}
                        className={`h-8 w-8 ${isListening ? "text-red-500" : ""}`}
                      >
                        <Mic className={isListening ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isListening ? "音声入力停止" : "音声入力開始"}</TooltipContent>
                  </Tooltip>
                }
                
                {showToolbarButton('VIM ON/OFF') && <Tooltip>
                  <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={toggleVimMode} className="h-8 w-8"><Terminal className="h-4 w-4" /></Button></TooltipTrigger>
                  <TooltipContent>{isVimMode ? "Disable Vim Mode" : "Enable Vim Mode"}</TooltipContent>
                </Tooltip>}
                {showToolbarButton('Toc ON/OFF') && <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isTocVisible ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={toggleToc}
                      className="h-8 w-8"
                      disabled={driveEnabled}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isTocVisible ? "Hide Table of Contents" : "Show Table of Contents"}{driveEnabled ? " (Disabled when Google Drive is ON)" : ""}</TooltipContent>
                </Tooltip>}
                {process.env.NEXT_PUBLIC_GOOGLE_FLAG !== 'OFF' && showToolbarButton('Google Drivew ON/OFF') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDriveToggle(!driveEnabled)}
                        disabled={!isAuthenticated}
                        className={`h-8 w-8 ${driveEnabled ? 'text-blue-500' : ''}`}
                        aria-label="Toggle Google Drive integration"
                      >
                       {driveEnabled ? <UploadCloud className="h-4 w-4" /> : <UploadCloud className="h-4 w-4 opacity-50" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{driveEnabled ? "Disable Google Drive" : "Enable Google Drive"}{!isAuthenticated ? " (Login required)" : ""}</TooltipContent>
                  </Tooltip>
                )}
                {/* Marp マニュアル */}
                {showToolbarButton('💡Marp') &&
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" onClick={() => window.open(`/api/preview-markdown?path=${encodeURIComponent('/manual/marp_manual.md')}`, '_blank')} className="h-8 w-8">
                       <CircleHelp className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>Marpマニュアルを開く</TooltipContent>
                 </Tooltip>
                }
                {/* Quarto マニュアル */}
                {showToolbarButton('💡Quatro') && // 条件を '💡Quatro' に修正
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" onClick={() => window.open(`/api/preview-markdown?path=${encodeURIComponent('/manual/quatro_manual.md')}`, '_blank')} className="h-8 w-8"> {/* quatro -> quarto */}
                       <CircleHelp className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>Quartoマニュアルを開く</TooltipContent> {/* quarto */}
                 </Tooltip>
                }
              </div>
              {/* --- ▲ MODIFIED ▲ --- */}
            </div>
          </TooltipProvider>
        </div>

        {/* 音声認識中の表示 */}
        {isListening && (
          <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md flex items-center">
            <Mic className="h-4 w-4 mr-2 animate-pulse" />
            <div>
              <span className="font-bold mr-2">音声入力中:</span>
              <span>{recognizedText || "..."}</span>
            </div>
          </div>
        )}

        {/* --- Main Content Area (Editor/Preview) --- */}
        {/* --- ▼ MODIFIED ▼ --- */}
        {/* flex-grow を適用し、残りの高さを埋めるようにする */}
        <div className="flex-grow overflow-auto">
          {/* ResizablePanelGroup and view modes */}
          {/* (ここの内部構造は変更なし、ただし親要素の高さ管理が変わった) */}
          {viewMode === 'editor' && (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    {driveEnabled && isAuthenticated && accessToken ? (
                      <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                    ) : (
                      <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                    )}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              ) : null}
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 80 : 100}>
                <div className="h-full overflow-auto">{EditorComponent}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
          {/* ...他の viewMode の分岐も同様 ... */}
           {viewMode === 'preview' && (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    {driveEnabled && isAuthenticated && accessToken ? (
                      <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                    ) : (
                      <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                    )}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              ) : null}
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 80 : 100}>
                {PreviewComponent}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
           {viewMode === 'split' && (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    {driveEnabled && isAuthenticated && accessToken ? (
                      <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                    ) : (
                      <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                    )}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              ) : null}
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 40 : 50}>
                <div className="h-full overflow-auto">{EditorComponent}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 40 : 50}>
                {PreviewComponent}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
           {viewMode === 'triple' && (
             <TripleLayout
                editorComponent={<div className="h-full overflow-auto">{EditorComponent}</div>}
                previewComponent={
                    // ここの参照を修正
                    outputMode === 'marp' ? MarpPreviewComponent :
                    outputMode === 'quarto' ? QuartoPreviewComponent :
                    PreviewComponent
                }
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
                getEditorContent={getEditorContentCallback}
                setInput={setInput}
                append={append as any}
              />
          )}
           {viewMode === 'marp-preview' && (
             <ResizablePanelGroup direction="horizontal" className="h-full">
              {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    {driveEnabled && isAuthenticated && accessToken ? (
                      <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                    ) : (
                      <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                    )}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              ) : null}
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 80 : 100}>
                {MarpPreviewComponent}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
           {viewMode === 'marp-split' && (
             <ResizablePanelGroup direction="horizontal" className="h-full">
              {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    {driveEnabled && isAuthenticated && accessToken ? (
                      <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                    ) : (
                      <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                    )}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              ) : null}
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 40 : 50}>
                <div className="h-full overflow-auto">{EditorComponent}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 40 : 50}>
                {MarpPreviewComponent}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
           {viewMode === 'quarto-preview' && (
             <ResizablePanelGroup direction="horizontal" className="h-full">
              {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    {driveEnabled && isAuthenticated && accessToken ? (
                      <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                    ) : (
                      <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                    )}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              ) : null}
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 80 : 100}>
                {QuartoPreviewComponent}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
           {viewMode === 'quarto-split' && (
             <ResizablePanelGroup direction="horizontal" className="h-full">
              {(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    {driveEnabled && isAuthenticated && accessToken ? (
                      <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                    ) : (
                      <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                    )}
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              ) : null}
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 40 : 50}>
                <div className="h-full overflow-auto">{EditorComponent}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={(driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 40 : 50}>
                {QuartoPreviewComponent}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
        {/* --- ▲ MODIFIED ▲ --- */}

        {/* --- Status Bar --- */}
        <div className={`sticky bottom-0 left-0 right-0 p-1 border-t text-xs flex justify-between items-center shrink-0 z-10 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
          <div>Ln {cursorPosition.line}, Col {cursorPosition.col}</div>
          <div>
            <span>Mode: {outputMode.charAt(0).toUpperCase() + outputMode.slice(1)}</span>
            {getPreviewModeName() && <span className="ml-2">Preview: {getPreviewModeName()}</span>}
            {isVimMode && <span className="ml-2 font-bold text-green-500">VIM</span>}
          </div>
        </div>

        {/* Hidden file input for image upload */}
        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      </div> {/* End Main Content Area Flex Col */}
    </div> /* End Top Level Flex Container */
  )
}

