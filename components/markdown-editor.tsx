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

import { useState, useRef, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Bold, Italic, List, ListOrdered, Quote, Code, Link, Image, Save, Printer, Heading1, Heading2, Heading3, Table, CheckSquare, Moon, Sun, Smile, Box, MessageSquare, SplitSquareVertical, Trash2, Terminal, Upload, Presentation, Columns, FileDown, FileCode, BotMessageSquare, FileChartColumn, ChartColumn, FileText, Tv, FileBox, UserCheck, UserX, Settings2, LogOut, UploadCloud, DownloadCloud, ExternalLink, CircleHelp, File as FileIcon, Mic, ZoomIn, ZoomOut, Maximize, Minimize, Palette, GitBranch, Scissors, Copy, ClipboardPaste, Plus, X, Pencil
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus, oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism" // スタイルをまとめてインポート
import CodeMirror from "@uiw/react-codemirror"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { vscodeDark } from "@uiw/codemirror-theme-vscode"
import { xcodeLight } from "@uiw/codemirror-theme-xcode" // xcodeLight を別パッケージからインポート
import { EditorView, keymap, lineNumbers } from "@codemirror/view" // view関連をまとめてインポート
import { vim } from "@replit/codemirror-vim"
import { EmojiPicker } from "./emoji-picker"
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger, 
  ContextMenuSeparator, 
  ContextMenuSub, 
  ContextMenuSubContent, 
  ContextMenuSubTrigger 
} from "@/components/ui/context-menu"
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
import MarpPreviewContainer from "./marp-preview-container"
import QuartoPreview from "./quarto-preview"
import TableOfContents from "./table-of-contents" // Heading をここからインポート
import { ScrollArea } from "@/components/ui/scroll-area"
// Heading 型を TableOfContents からインポート
import { type Heading } from "./table-of-contents"; // 'type' を使ったインポートに修正
import { useAutoSave } from "@/hooks/use-auto-save";
import { loadDraft, deleteDraft } from "@/lib/draft-storage";
import { load } from "js-yaml";      // ★ 追加：YAML パーサ
import { type LoadOptions } from 'js-yaml'; // YamlLoadOptions -> LoadOptions に修正
import React from 'react'; // React をインポート
import MarkmapDiagram from "./markmap-diagram"; // Markmapコンポーネントをインポート
import { cn } from "@/lib/utils"
import type { DocumentTab } from './document-tabs'
import FileExplorer from "./file-explorer";
import { Folder } from "lucide-react";
// import { useToast } from "@/components/ui/use-toast" // この機能は使用していないため削除

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

// デフォルトのMarkdownコンテンツ
const DEFAULT_CONTENT = "# Hello, World!\n\n## Section 1\nSome text\n\n## Section 2\nMore text"

// MarkdownEditorProps型定義を追加
interface MarkdownEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onEditorStateUpdate?: (cursorPosition: { line: number, col: number }, 
                        outputMode: 'markdown' | 'marp' | 'quarto', 
                        previewMode: string | null, 
                        isVimMode: boolean) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  isFirstAccess?: boolean;
  onFileSaved?: (fileName: string) => void;
  tabTitle?: string;
  onVoiceInputStateChange?: (isListening: boolean, toggleFunc: () => void) => void;
  onVimModeStateChange?: (isVimMode: boolean, toggleFunc: () => void) => void;
  tabs?: DocumentTab[];
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  onTabClose?: (id: string) => void;
  onTabAdd?: () => void;
  onUpdateTabTitle?: (id: string, title: string) => void;
  onOpenFileInNewTab?: (filePath: string, fileName: string, content: string) => Promise<string>;
}

// --- コンポーネント本体 ---
const MarkdownEditor = forwardRef<any, MarkdownEditorProps>(({ 
  initialContent, 
  onContentChange,
  onEditorStateUpdate,
  isDarkMode: propIsDarkMode,
  onToggleDarkMode,
  isFirstAccess = true,
  onFileSaved,
  tabTitle,
  onVoiceInputStateChange,
  onVimModeStateChange, // Vimモード状態変更通知用のコールバック
  tabs = [], // タブリスト用の配列を追加
  activeTabId = '', // アクティブなタブのID
  onTabChange, // タブ切り替え時のコールバック
  onTabClose, // タブ閉じる時のコールバック
  onTabAdd, // 新規タブ追加時のコールバック
  onUpdateTabTitle, // タブ名更新用のコールバック
  onOpenFileInNewTab, // 新規ファイルを開くためのコールバック
}, ref) => {
  // --- State Variables ---

  // Editor State
  const [markdownContent, setMarkdownContent] = useState(initialContent || DEFAULT_CONTENT)
  const [isVimMode, setIsVimMode] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [previewFontSize, setPreviewFontSize] = useState(16);
  // 親からダークモードが渡されている場合はそれを使用し、そうでなければローカルステートを使用
  const [localIsDarkMode, setLocalIsDarkMode] = useState(false)
  const isDarkMode = propIsDarkMode !== undefined ? propIsDarkMode : localIsDarkMode;
  
  const [outputMode, setOutputMode] = useState<'markdown' | 'marp' | 'quarto'>('markdown')
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split' | 'triple' | 'marp-preview' | 'marp-split' | 'quarto-preview' | 'quarto-split' | 'markmap' | 'markmap-split'>('split')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isPptxGenerating, setIsPptxGenerating] = useState(false)
  const [isQuartoPptxGenerating, setIsQuartoPptxGenerating] = useState(false);
  const [isQuartoPdfGenerating, setIsQuartoPdfGenerating] = useState(false);
  const [isTocVisible, setIsTocVisible] = useState(false);
  // Marpテーマ関連
  const [selectedMarpTheme, setSelectedMarpTheme] = useState("default");
  const [marpThemes, setMarpThemes] = useState<string[]>(["default"]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);
  // AIチャットから戻る時に前の状態を記憶するための状態変数
  const [previousViewMode, setPreviousViewMode] = useState<'editor' | 'preview' | 'split' | 'triple' | 'marp-preview' | 'marp-split' | 'quarto-preview' | 'quarto-split' | 'markmap' | 'markmap-split'>('split');
  // ファイルエクスプローラー関連
  const [isFileExplorerVisible, setIsFileExplorerVisible] = useState(false);

  // Google Drive State
  const [driveEnabled, setDriveEnabled] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<GoogleFile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // AI Chat State (using useChat hook)
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput, append, reload, stop } = useChat();

  // コンテンツが変更されたときの処理 - 親コンポーネントに通知
  useEffect(() => {
    if (onContentChange) {
      onContentChange(markdownContent);
    }
  }, [markdownContent, onContentChange]);

  // エディタの状態情報を親コンポーネントに通知
  useEffect(() => {
    if (onEditorStateUpdate) {
      const previewModeStr = getPreviewModeName();
      // モード切替中は通知をスキップ（handleModeChangeで直接通知するため）
      if (!previewModeStr || 
          (previewModeStr === 'Markdown' && outputMode === 'markdown') ||
          (previewModeStr === 'Marp' && outputMode === 'marp') ||
          (previewModeStr === 'Quarto' && outputMode === 'quarto') ||
          (previewModeStr === 'Markmap' && outputMode === 'markdown')) {
        onEditorStateUpdate(
          cursorPosition,
          outputMode,
          previewModeStr,
          isVimMode
        );
      }
    }

    // AIチャットモードに入る前の状態を記憶（型安全な方法で）
    if (viewMode !== 'triple' && previousViewMode !== viewMode) {
      setPreviousViewMode(viewMode);
    }
  }, [cursorPosition, outputMode, viewMode, isVimMode, onEditorStateUpdate, previousViewMode]);

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
        ".cm-panel": { 
          zIndex: "100 !important", 
          bottom: "2.5em !important",
          maxHeight: "calc(100% - 3em) !important"
        }
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

  // 選択テキストを取得する関数
  const getSelectedEditorContent = useCallback((): string | null => {
    if (viewRef.current) {
      const view = viewRef.current;
      const selection = view.state.selection.main;
      // 選択範囲がない場合はnullを返す
      if (selection.from === selection.to) {
        return null;
      }
      // 選択範囲のテキストを返す
      return view.state.sliceDoc(selection.from, selection.to);
    }
    return null;
  }, []);

  // 選択テキストを置換する関数
  const replaceSelectedEditorContent = useCallback((text: string): void => {
    if (viewRef.current) {
      const view = viewRef.current;
      const selection = view.state.selection.main;
      // 選択範囲がある場合のみ置換
      if (selection.from !== selection.to) {
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: text },
          selection: { anchor: selection.from + text.length },
          userEvent: "input"
        });
        view.focus();
      } else {
        // 選択範囲がない場合は通常の挿入と同じ動作
        const currentPos = view.state.selection.main.head;
        view.dispatch({
          changes: { from: currentPos, to: currentPos, insert: text },
          selection: { anchor: currentPos + text.length }
        });
        view.focus();
      }
    }
  }, []);

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

  // --- ▼ MODIFIED ▼ ---
  // toggleDarkMode関数を更新
  const toggleDarkMode = useCallback(() => {
    if (onToggleDarkMode) {
      // 親コンポーネントから関数が渡されている場合はそれを使用
      onToggleDarkMode();
    } else {
      // 渡されていない場合はローカルステートを更新
      setLocalIsDarkMode(prev => {
        const newMode = !prev;
        document.documentElement.classList.toggle('dark', newMode);
        return newMode;
      });
    }
  }, [onToggleDarkMode]);
  // --- ▲ MODIFIED ▲ ---

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
    console.log('ファイル名生成を開始:', content.substring(0, 100) + '...');
    const firstLine = content.split('\n')[0] || '';
    console.log('最初の行:', firstLine);
    
    // デフォルトコンテンツの場合や空の場合は「Untitled」を返す
    if (!firstLine.trim() || firstLine.trim() === '# New Document') {
      console.log('デフォルトコンテンツを検出、「Untitled」を使用します');
      return `Untitled.${defaultExt}`;
    }
    
    let baseName = firstLine.replace(/^#+\s*/, '').trim();
    baseName = baseName.replace(/\s+/g, '_'); // スペースをアンダースコアに
    baseName = baseName.replace(/[\\/:*?"<>|]/g, '_'); // ファイル名に使えない文字を置換
    
    const potentialFileName = baseName ? `${baseName}.${defaultExt}` : '';
    const result = potentialFileName || `Untitled.${defaultExt}`;
    console.log('生成されたファイル名:', result);
    return result;
  };

  const handleDriveSave = useCallback(async () => {
    // ... (ここは変更なし) ...
     if (!accessToken) return;
    setIsSaving(true);
    try {
      // selectedFileがある場合はその名前、なければタブ名、最後の手段としてgenerateFileName関数を使用
      const fileName = selectedFile?.name || 
                      (tabTitle && tabTitle !== 'Untitled' ? `${tabTitle}.md` : generateFileName(markdownContent));
      console.log('Google Driveへの保存用ファイル名:', fileName, 
                 '(選択済みファイル:', Boolean(selectedFile), 
                 'タブ名から生成:', Boolean(!selectedFile && tabTitle && tabTitle !== 'Untitled'), ')');
      
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
      
      // Google Driveへの保存後に親コンポーネントに通知
      if (onFileSaved) {
        onFileSaved(savedFileData.name);
      }
    } catch (error: any) {
      console.error('Google Drive保存エラー:', error);
      alert(error.message || 'Google Driveへの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, markdownContent, selectedFile, setSelectedFile, onFileSaved, tabTitle]);

  const handleLocalSave = async (forceOverwrite = false) => {
    setIsSaving(true);
    try {
      // tabTitleが存在し、「Untitled」でない場合はそれを使用、それ以外は従来通りgenerateFileName関数を使用
      const suggestedName = (tabTitle && tabTitle !== 'Untitled')
        ? `${tabTitle}.md`
        : generateFileName(markdownContent);
      
      console.log('======= ファイル保存開始 =======');
      console.log('提案されたファイル名:', suggestedName, 'タブ名から生成:', Boolean(tabTitle && tabTitle !== 'Untitled'));
      
      // 環境変数FILE_UPLOADがOFFの場合、従来のローカル保存処理を行う
      const fileUploadEnabled = process.env.NEXT_PUBLIC_FILE_UPLOAD !== 'OFF';
      
      if (!fileUploadEnabled) {
        console.log('FILE_UPLOAD=OFFのため、従来のローカル保存処理を実行します');
        
        if ('showSaveFilePicker' in window && typeof window.showSaveFilePicker === 'function') {
          console.log('File System Access APIを使用します');
          const fileHandle = await window.showSaveFilePicker({
            suggestedName,
            types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
          });
          
          // ファイルハンドルから名前を取得（実際にユーザーが選択した名前）
          const fileHandleAny = fileHandle as any;
          console.log('ファイルハンドル:', fileHandleAny);
          
          // 名前プロパティの存在確認
          let fileName = suggestedName;
          if (fileHandleAny && 'name' in fileHandleAny) {
            fileName = fileHandleAny.name;
            console.log('取得したファイル名:', fileName);
          } else {
            console.warn('ファイルハンドルからname属性を取得できませんでした');
          }
          
          const writable = await fileHandle.createWritable();
          await writable.write(markdownContent);
          await writable.close();
          console.log("ファイルが保存されました (File System Access API)");
          
          // 実際にユーザーが選択したファイル名を使用
          if (onFileSaved) {
            console.log('onFileSavedコールバックを呼び出します。ファイル名:', fileName);
            onFileSaved(fileName);
          }
        } else {
          console.log('従来のダウンロード方式を使用します');
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
          console.log("従来の方法でファイルがダウンロードされました:", suggestedName);
          
          // ファイル保存後に親コンポーネントに通知
          if (onFileSaved) {
            console.log('onFileSavedコールバックを呼び出します。ファイル名:', suggestedName);
            onFileSaved(suggestedName);
          }
        }
      } else {
        // FILE_UPLOADがOFFでない場合、新しいAPIを使用してサーバーサイドに保存
        console.log('HTTP APIを使用してFILE_EXPLORER_ROOT_DIRにファイルを保存します');
        
        // ローカルストレージから現在のパスとルートディレクトリを取得
        const currentPath = localStorage.getItem('markdownEditorCurrentPath') || '/';
        const rootDir = localStorage.getItem('markdownEditorRootDir');
        
        console.log('保存先ディレクトリ情報:', {
          currentPath,
          rootDir,
          folderPathType: typeof currentPath,
          folderPathLength: currentPath.length,
          forceOverwrite,
          requestBodySample: JSON.stringify({
            fileName: suggestedName,
            content: markdownContent.substring(0, 50) + '...',
            folderPath: currentPath,
            overwrite: forceOverwrite
          }, null, 2)
        });
        
        // まずファイルの存在を確認する（forceOverwrite=trueの場合はスキップ）
        if (!forceOverwrite) {
          console.log('ファイルの存在を確認します');
          const checkResponse = await fetch('/api/files/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fileName: suggestedName,
              folderPath: currentPath,
              checkOnly: true
            })
          });
          
          const checkResult = await checkResponse.json();
          console.log('ファイル存在確認結果:', checkResult);
          
          if (checkResult.exists) {
            // ファイルが存在する場合、ユーザーに確認
            const userConfirmed = window.confirm(
              `ファイル「${suggestedName}」は既に存在します。上書きしますか？`
            );
            
            if (!userConfirmed) {
              console.log('ユーザーが上書きをキャンセルしました');
              setIsSaving(false);
              return; // 保存処理を中止
            }
            
            // ユーザーが確認した場合は、forceOverwrite=trueで再帰的に呼び出す
            console.log('ユーザーが上書きを確認しました。強制上書きモードで保存します');
            return handleLocalSave(true);
          }
        }
        
        // 通常の保存処理またはforceOverwrite=trueの場合の処理
        const response = await fetch('/api/files/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileName: suggestedName,
            content: markdownContent,
            folderPath: currentPath, // 現在選択中のフォルダパスを送信
            overwrite: forceOverwrite // 上書きフラグを設定
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          // 上書き確認が必要な場合（409 Conflict）
          if (response.status === 409 && errorData.requiresConfirmation) {
            const userConfirmed = window.confirm(
              `ファイル「${suggestedName}」は既に存在します。上書きしますか？`
            );
            
            if (!userConfirmed) {
              console.log('ユーザーが上書きをキャンセルしました');
              setIsSaving(false);
              return; // 保存処理を中止
            }
            
            // ユーザーが確認した場合は、forceOverwrite=trueで再帰的に呼び出す
            console.log('ユーザーが上書きを確認しました。強制上書きモードで保存します');
            return handleLocalSave(true);
          }
          
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('ファイル保存結果:', result);
        
        alert(`ファイル「${suggestedName}」をサーバーに保存しました`);
        
        // ファイル保存後に親コンポーネントに通知
        if (onFileSaved) {
          console.log('onFileSavedコールバックを呼び出します。ファイル名:', suggestedName);
          onFileSaved(suggestedName);
        }
      }
      
      console.log('======= ファイル保存完了 =======');
    } catch (error) {
      console.error("ファイル保存中にエラーが発生しました:", error);
      alert(`保存エラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = useCallback(async (forceOverwrite = false) => {
    // ... (ここは変更なし) ...
     if (driveEnabled && isAuthenticated && accessToken) {
      await handleDriveSave();
    } else {
      await handleLocalSave(forceOverwrite);
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
    pre{background-color:#f5f5f5;border-radius:6px;padding:16px;overflow:auto;color:#333333;border:1px solid #e0e0e0;margin-bottom:30px;}
    pre code{font-family:SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;background:none;padding:0;color:inherit;}
    code:not(pre > code){font-family:SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;background-color:rgba(27,31,35,.05);padding:.2em .4em;margin:0;font-size:85%;border-radius:3px;}
    /* ライトモード用のトークンカラー */
    .token.keyword{color:#0000ff;}.token.string{color:#a31515;}.token.function{color:#795e26;}.token.comment{color:#008000;}
    .token.class-name{color:#267f99;}.token.operator{color:#000000;}.token.number{color:#098658;}.token.builtin{color:#267f99;}
    .token.punctuation{color:#000000;}.token.property{color:#001080;}
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

  // 選択テキスト取得関数をメモ化
  const getSelectedEditorContentCallback = useCallback((): string | null => {
    return getSelectedEditorContent();
  }, [getSelectedEditorContent]);

  // 選択テキスト置換関数をメモ化
  const replaceSelectedEditorContentCallback = useCallback((text: string): void => {
    replaceSelectedEditorContent(text);
  }, [replaceSelectedEditorContent]);

  // --- ▼ ADDED ▼ ---
  // サイドバーでのモード切替ハンドラ
  const handleModeChange = useCallback((newMode: 'markdown' | 'marp' | 'quarto') => {
    console.log('handleModeChange が呼ばれました:', newMode);
    
    // プレビュータイプとビューモードを事前に決定
    let newPreviewMode: string;
    let newViewMode: 'editor' | 'preview' | 'split' | 'triple' | 'marp-preview' | 'marp-split' | 'quarto-preview' | 'quarto-split' | 'markmap' | 'markmap-split';
    
    // モードに応じてプレビュータイプとビューモードを設定
    switch (newMode) {
      case 'markdown':
        newPreviewMode = 'Markdown';
        newViewMode = 'split';
        break;
      case 'marp':
        newPreviewMode = 'Marp';
        newViewMode = 'marp-split';
        break;
      case 'quarto':
        newPreviewMode = 'Quarto';
        newViewMode = 'quarto-split';
        break;
      default:
        newPreviewMode = 'Markdown';
        newViewMode = 'split';
    }
    
    console.log(`モード切替: ${outputMode} → ${newMode}, プレビュータイプ: ${newPreviewMode}, ビューモード: ${newViewMode}`);
    
    // 状態更新を一括で行う（バッチ処理）
    // React の状態更新をバッチ処理する関数を使ってみる
    const batchUpdates = () => {
      // 出力モードを更新
      setOutputMode(newMode);
      // viewModeを設定
      setViewMode(newViewMode);
    };
    
    // バッチ更新を実行
    batchUpdates();
    
    // 親コンポーネントに直接通知（状態更新とは別に行う）
    if (onEditorStateUpdate && viewRef.current) {
      try {
        // カーソル位置情報を取得
        const doc = viewRef.current.state.doc;
        const selection = viewRef.current.state.selection;
        
        if (doc && selection) {
          const head = selection.main.head;
          const line = doc.lineAt(head).number;
          const lineStart = doc.lineAt(head).from;
          const col = head - lineStart + 1;
          
          console.log(`モード切替時に親コンポーネントに通知: モード=${newMode}, プレビュー=${newPreviewMode}`);
          
          // 親コンポーネントに直接通知
          onEditorStateUpdate(
            { line, col },
            newMode,  // 新しいモードを使用
            newPreviewMode,  // 新しいプレビュータイプを使用
            isVimMode
          );
        }
      } catch (err) {
        console.error('エディタ状態の取得中にエラーが発生しました:', err);
      }
    }
  }, [onEditorStateUpdate, viewRef, isVimMode, outputMode, setOutputMode, setViewMode]);
  // --- ▲ MODIFIED ▲ ---

  // プレビューモード名取得ヘルパー (変更なし)
  const getPreviewModeName = () => {
    if (viewMode.includes('marp')) return 'Marp';
    if (viewMode.includes('quarto')) return 'Quarto';
    if (viewMode.includes('markmap')) return 'Markmap'; // 追加
    if (viewMode.includes('preview') || viewMode.includes('split')) return 'Markdown';
    return null;
  };

  // トリプルモードかどうかを判定
  const isTripleView = () => {
    return viewMode === 'triple';
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

  // ドラフト保存機能は削除し、コンテンツ変更時は親コンポーネント（DocumentManager）に
  // 通知するだけにします。DocumentManagerがmarkdown-app-tabsに保存を行います。
  useEffect(() => {
    // 変更があった場合、親コンポーネントに通知
    if (onContentChange) {
      // 少し遅延させて連続更新を防止
      const timeoutId = setTimeout(() => {
        onContentChange(markdownContent);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [markdownContent, onContentChange]);

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

  // --- フォントサイズ変更ハンドラ ---
  const handleZoomIn = useCallback(() => {
    setPreviewFontSize(prevSize => Math.min(prevSize + 2, 40)); // 上限 40px
  }, []);

  const handleZoomOut = useCallback(() => {
    setPreviewFontSize(prevSize => Math.max(prevSize - 2, 8)); // 下限 8px
  }, []);

  // --- Component Definitions ---
  const EditorComponent = useMemo(() => (
    <ContextMenu>
      <ContextMenuTrigger>
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
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span className="flex items-center">
              <Bold className="mr-2 h-4 w-4" />
              フォーマット
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => insertText("**", "**")}>
              <Bold className="mr-2 h-4 w-4" />
              <span>ボールド</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("*", "*")}>
              <Italic className="mr-2 h-4 w-4" />
              <span>イタリック</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("~~", "~~")}>
              <span className="mr-2 h-4 w-4 flex items-center justify-center">S</span>
              <span>取り消し線</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("==", "==")}>
              <span className="mr-2 h-4 w-4 flex items-center justify-center">H</span>
              <span>ハイライト</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("`", "`")}>
              <Code className="mr-2 h-4 w-4" />
              <span>コード</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("$", "$")}>
              <span className="mr-2 h-4 w-4 flex items-center justify-center">∑</span>
              <span>数学</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("<!-- ", " -->")}>
              <span className="mr-2 h-4 w-4 flex items-center justify-center">%</span>
              <span>コメント</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        {/* パラグラフサブメニュー */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span className="flex items-center">
              <ListOrdered className="mr-2 h-4 w-4" />
              パラグラフ
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => insertText("# ", "\n")}>
              <Heading1 className="mr-2 h-4 w-4" />
              <span>見出し 1</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("## ", "\n")}>
              <Heading2 className="mr-2 h-4 w-4" />
              <span>見出し 2</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("### ", "\n")}>
              <Heading3 className="mr-2 h-4 w-4" />
              <span>見出し 3</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => insertText("- ", "\n")}>
              <List className="mr-2 h-4 w-4" />
              <span>箇条書きリスト</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("1. ", "\n")}>
              <ListOrdered className="mr-2 h-4 w-4" />
              <span>番号付きリスト</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("- [ ] ", "\n")}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>タスクリスト</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("> ", "\n")}>
              <Quote className="mr-2 h-4 w-4" />
              <span>引用</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        {/* 挿入サブメニュー */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span className="flex items-center">
              <Image className="mr-2 h-4 w-4" />
              挿入
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => insertText("|  |  |\n|--|--|\n|  |  |\n")}>
              <Table className="mr-2 h-4 w-4" />
              <span>テーブル</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("```\n", "\n```")}>
              <Code className="mr-2 h-4 w-4" />
              <span>コードブロック</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("[^1]: ", "\n")}>
              <span className="mr-2 h-4 w-4 flex items-center justify-center">F</span>
              <span>Footnote</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("---\n", "")}>
              <span className="mr-2 h-4 w-4 flex items-center justify-center">—</span>
              <span>水平線</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => insertText("```mermaid\ngraph TD\n  A[開始] --> B[処理]\n  B --> C[終了]\n```\n")}>
              <Box className="mr-2 h-4 w-4" />
              <span>Mermaid図</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertText("```mindmap\n# マインドマップ\n## トピック1\n### サブトピック\n## トピック2\n### サブトピック\n#### 詳細\n```\n")}>
              <GitBranch className="mr-2 h-4 w-4" />
              <span>マインドマップ</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* ヘッダ挿入サブメニュー */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span className="flex items-center">
              <FileCode className="mr-2 h-4 w-4" />
              ヘッダ挿入
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {/* Quartoヘッダ挿入 */}
            <ContextMenuItem onClick={() => insertText(`---\ntitle: "Quarto Basics"\nformat:\n  html:\n    code-fold: true\njupyter: python3\n---\n\n`, "")}>
              <FileCode className="mr-2 h-4 w-4" />
              <span>Quartoヘッダ</span>
            </ContextMenuItem>
            
            {/* Marpテーマ選択 */}
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <span className="flex items-center">
                  <Palette className="mr-2 h-4 w-4" />
                  Marpテーマ
                </span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {isLoadingThemes ? (
                  <div className="flex items-center justify-center py-2 px-4 text-sm text-muted-foreground">
                    <span className="animate-spin mr-2">⌛</span>テーマ読み込み中...
                  </div>
                ) : marpThemes.length > 0 ? (
                  marpThemes.map((theme) => (
                    <ContextMenuItem 
                      key={theme} 
                      onClick={() => insertMarpHeader(theme)}
                      className={selectedMarpTheme === theme ? "font-bold bg-muted" : ""}
                    >
                      {theme}
                    </ContextMenuItem>
                  ))
                ) : (
                  <div className="py-2 px-4 text-sm text-muted-foreground">
                    テーマが見つかりませんでした
                  </div>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuSubContent>
        </ContextMenuSub>
  
        {/* 絵文字ピッカー */}
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span className="flex items-center">
              <Smile className="mr-2 h-4 w-4" />
              絵文字
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-80 p-0">
            <EmojiPicker onEmojiSelect={insertEmoji} />
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        {/* リンクとイメージ */}
        <ContextMenuSeparator />          
        <ContextMenuItem onClick={() => insertText("[", "](url)")}>
          <Link className="mr-2 h-4 w-4" />
          <span>リンクを追加</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => imageInputRef.current?.click()}>
          <Image className="mr-2 h-4 w-4" />
          <span>画像を追加</span>
        </ContextMenuItem>
                
        {/* 編集操作メニュー */}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => {
          if (viewRef.current) {
            const view = viewRef.current;
            const selection = view.state.selection.main;
            if (selection.from !== selection.to) {
              const selectedText = view.state.sliceDoc(selection.from, selection.to);
              navigator.clipboard.writeText(selectedText);
              // カット：選択テキストを削除
              view.dispatch({
                changes: { from: selection.from, to: selection.to, insert: "" },
                selection: { anchor: selection.from }
              });
              view.focus();
            }
          }
        }}>
          <Scissors className="mr-2 h-4 w-4" />
          <span>カット</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          if (viewRef.current) {
            const view = viewRef.current;
            const selection = view.state.selection.main;
            if (selection.from !== selection.to) {
              const selectedText = view.state.sliceDoc(selection.from, selection.to);
              navigator.clipboard.writeText(selectedText);
              view.focus();
            }
          }
        }}>
          <Copy className="mr-2 h-4 w-4" />
          <span>コピー</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (viewRef.current && text) {
              const view = viewRef.current;
              const pos = view.state.selection.main.head;
              view.dispatch({
                changes: { from: pos, to: pos, insert: text },
                selection: { anchor: pos + text.length }
              });
              view.focus();
            }
          } catch (err) {
            console.error('クリップボードからの読み取りに失敗しました:', err);
          }
        }}>
          <ClipboardPaste className="mr-2 h-4 w-4" />
          <span>ペースト</span>
        </ContextMenuItem>
        
        {/* すべてを選択 */}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => {
          if (viewRef.current) {
            const view = viewRef.current;
            const doc = view.state.doc;
            view.dispatch({
              selection: { anchor: 0, head: doc.length }
            });
          }
        }}>
          <span className="mr-2 h-4 w-4 flex items-center justify-center">A</span>
          <span>すべてを選択</span>
        </ContextMenuItem>
        {/* 以下を削除: Marpテーマ選択とQuartoヘッダ（挿入サブメニューに移動したため） */}
      </ContextMenuContent>
    </ContextMenu>
  ), [markdownContent, editorExtensions, handleContentChange, isDarkMode, insertText, handleCursorUpdate, imageInputRef, insertEmoji, isLoadingThemes, marpThemes, selectedMarpTheme]);

  const PreviewComponent = useMemo(() => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className={`h-full overflow-auto custom-scrollbar ${isDarkMode ? 'bg-[#171717]' : 'bg-white'} relative group`}>
          {/* 拡大・縮小ボタンコンテナ */}
          <div className={`absolute top-2 right-2 z-10 flex items-center space-x-1 p-1 rounded bg-gray-200 dark:bg-[#171717] opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>縮小</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>拡大</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* ★★★ 修正箇所 ★★★ */}
          {/* prose クラスをこの div に移動し、style もここに適用 */}
          <div
            ref={tabPreviewRef}
            className={`markdown-preview p-4 pb-12 prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`} // prose をここに追加、pb-12で下部に余白拡大
            style={{ fontSize: `${previewFontSize}px` }} // インラインスタイルをここに適用
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              // className から prose を削除
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
                            <div className={`code-language px-4 py-1 text-xs ${isDarkMode ? 'bg-[#171717] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
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

                  // mindmap コードブロックのサポートを追加
                  if (language === 'mindmap') {
                    if (outputMode === 'markdown') {
                      return <MarkmapDiagram markdown={codeContent} isDarkMode={isDarkMode} />;
                    } else {
                      return (
                        <div className="code-block-wrapper my-4 rounded-md overflow-hidden">
                          <div className={`code-language px-4 py-1 text-xs ${isDarkMode ? 'bg-[#171717] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                            mindmap
                          </div>
                          <SyntaxHighlighter
                            language={'markdown'}
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

                  // インラインコード
                  if (isInline) {
                    return <code className={className} {...props}>{children}</code>;
                  }

                  // 通常のコードブロックハイライト (YAML/Mermaid以外)
                  return (
                    <div className="code-block-wrapper my-4 rounded-md overflow-hidden">
                      <div className={`code-language px-4 py-1 text-xs ${isDarkMode ? 'bg-[#171717] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        {language || 'code'} 
                      </div>
                      <SyntaxHighlighter
                        language={language} // 修正: language 変数を渡す
                        PreTag="div"
                        style={isDarkMode ? vscDarkPlus as any : oneLight as any} 
                        customStyle={isDarkMode ? { background: '#000000' } : {}} // ダークモードの背景を #000000 に上書き
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
                  return <th className={`p-2 border ${isDarkMode ? 'border-gray-700 bg-[#171717]' : 'border-gray-300 bg-gray-100'}`}>{children}</th>;
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" />
          保存
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          印刷プレビュー
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ), [markdownContent, isDarkMode, previewFontSize, handleZoomIn, handleZoomOut, handleSave, handlePrint]);

  // MarpPreviewComponentの定義を修正
  const MarpPreviewComponent = useMemo(() => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className={`h-full overflow-auto custom-scrollbar ${isDarkMode ? 'bg-[#171717]' : 'bg-white'}`}>
          <div ref={tabPreviewRef} className="markdown-preview h-full w-full" style={{ padding: 0 }}> {/* paddingを0に設定 */}
            <MarpPreviewContainer
              markdown={markdownContent}
              isDarkMode={isDarkMode}
              mode={viewMode === 'marp-preview' ? 'slide' : 'realtime'} // marp-previewはスライドビュー、それ以外はリアルタイムビュー
            />
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" />
          保存
        </ContextMenuItem>
        <ContextMenuItem onClick={handleExportToPptx}>
          <FileDown className="h-4 w-4 mr-2" />
          PowerPoint出力
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ), [markdownContent, isDarkMode, viewMode, handleSave, handleExportToPptx]);

  const QuartoPreviewComponent = useMemo(() => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className={`quarto-preview-wrapper h-full overflow-auto custom-scrollbar ${isDarkMode ? 'bg-[#171717]' : 'bg-white'}`}>
          <div ref={tabPreviewRef} className="markdown-preview h-full">
            <QuartoPreview
              markdown={markdownContent}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" />
          保存
        </ContextMenuItem>
        <ContextMenuItem onClick={handleExportToQuartoPptx}>
          <FileDown className="h-4 w-4 mr-2" />
          PowerPoint出力
        </ContextMenuItem>
        <ContextMenuItem onClick={handleExportToQuartoPdf}>
          <FileIcon className="h-4 w-4 mr-2" />
          PDF出力
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ), [markdownContent, isDarkMode, handleSave, handleExportToQuartoPptx, handleExportToQuartoPdf]);

  // マインドマップのコンポーネント
  const MarkmapPreviewComponent = useMemo(() => (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className={`h-full overflow-auto custom-scrollbar ${isDarkMode ? 'bg-[#171717]' : 'bg-white'}`}>
          <div ref={tabPreviewRef} className="markdown-preview h-full w-full" style={{ padding: 0 }}>
            <MarkmapDiagram 
              markdown={markdownContent}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" />
          保存
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          印刷プレビュー
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ), [markdownContent, isDarkMode, handleSave, handlePrint]);

  // --- ▼ ADDED ▼ ---
  // ツールバーボタンの表示/非表示を決定するヘルパー
  const showToolbarButton = (buttonName: string): boolean => {
    // File UploaderがOFFの場合、ファイルエクスプローラーボタンを非表示
    if (buttonName === 'File Explorer' && process.env.NEXT_PUBLIC_FILE_UPLOAD === 'OFF') {
      return false;
    }
    
    // 常に表示するボタン
    if (buttonName === 'VoiceInput' || buttonName === 'VIM ON/OFF' || buttonName === 'Toc ON/OFF' || 
        buttonName === 'Google Drivew ON/OFF' || buttonName === 'Clear Editor' || 
        buttonName === 'AI Chat View' || buttonName === '💡Markmap' || 
        (buttonName === 'File Explorer' && process.env.NEXT_PUBLIC_FILE_UPLOAD !== 'OFF')) {
        return true;
    }
    // 基本的なフォーマットボタンも常に表示
    if (['H1', 'H2', 'H3', 'Bold', 'Italic', 'Emoji', 'Bullet List', 'Numberd List', 'Task List', 'Quato', 'Code Block', 'Table', 'Link', 'Image', 'Mindmap'].includes(buttonName)) {
      return true;
    }

    switch (outputMode) {
      case 'markdown':
        // MarkdownモードではMarp/Quarto関連ヘッダとマニュアルボタンを非表示
        return !['Marp Header', 'Quatro Header', '💡Marp', '💡Quatro', 'Mermaid'].includes(buttonName);
      case 'marp':
        // MarpモードではMermaid、Quartoヘッダ、Quartoマニュアルを非表示
        return !['Mermaid', 'Quatro Header', '💡Quatro'].includes(buttonName);
      case 'quarto':
        // QuartoモードではMermaid、Marpヘッダ、Marpマニュアルを非表示
        return !['Mermaid', 'Marp Header', '💡Marp'].includes(buttonName); // 💡Quatro を表示許可
      default:
        return true; // デフォルトは表示
    }
  };
  // --- ▲ ADDED ▲ ---

  // --- ▼ ADDED BACK ▼ ---
  // scrollbarStyle の定義を return 文の直前に戻す
  const scrollbarStyle = useMemo(() => `
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track {
      /* ▼ MODIFIED: ダークモードのトラック色を #171717 に */
      background: ${isDarkMode ? '#171717' : 'transparent'}; /* ダークモードのトラック色を変更 */
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
      /* ▼ MODIFIED: ダークモードのトラック色を #171717 に */
      scrollbar-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.2) #171717' : 'rgba(0, 0, 0, 0.2) transparent'}; /* ダークモードのトラック色を変更 */
      padding-bottom: 30px; /* ステータスバーとの重なり防止用の余白 */
    }

    /* CodeMirror 用 (.cm-scroller を直接ターゲット) */
    .cm-editor .cm-scroller::-webkit-scrollbar { width: 8px; }
    .cm-editor .cm-scroller::-webkit-scrollbar-track {
      /* ▼ MODIFIED: ダークモードのトラック色を #171717 に */
      background: ${isDarkMode ? '#171717' : 'transparent'}; /* ダークモードのトラック色を変更 */
    }
    .cm-editor .cm-scroller::-webkit-scrollbar-thumb {
      background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'};
      border-radius: 20px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .cm-editor .cm-scroller::-webkit-scrollbar-thumb:hover {
      background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
    }
    .cm-editor .cm-scroller {
      scrollbar-width: thin;
      /* ▼ MODIFIED: ダークモードのトラック色を #171717 に */
      scrollbar-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.2) #171717' : 'rgba(0, 0, 0, 0.2) transparent'}; /* ダークモードのトラック色を変更 */
      padding-bottom: 30px; /* Firefoxブラウザでのステータスバーとの重なり防止用の余白 */
    }
  `, [isDarkMode]);
  // --- ▲ ADDED BACK ▲ ---

  // 全画面表示の状態
  const [isFullScreen, setIsFullScreen] = useState(false);

  // 全画面表示切替ハンドラ
  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      // 全画面表示に切り替え
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        console.error(`全画面表示エラー: ${err.message}`);
      });
    } else {
      // 全画面表示終了
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullScreen(false);
        }).catch(err => {
          console.error(`全画面終了エラー: ${err.message}`);
        });
      }
    }
  }, []);

  // 全画面状態の監視
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Marpヘッダーを挿入する関数
  const insertMarpHeader = useCallback((themeName: string) => {
    setSelectedMarpTheme(themeName);
    insertText(`---\nmarp: true\ntheme: ${themeName}\n${isDarkMode ? '# class: invert' : '# class: invert'}\npaginate: true\nheader: "Header"\nfooter: "Footer"\n---\n\n`, "");
  }, [isDarkMode, insertText]);

  // Marpテーマを取得するEffect
  useEffect(() => {
    const fetchMarpThemes = async () => {
      setIsLoadingThemes(true);
      try {
        // タイムスタンプを追加してキャッシュを回避
        const timestamp = new Date().getTime();
        // 絶対URLに変更し、キャッシュを無効化するクエリパラメータを追加
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/marp-themes?t=${timestamp}`);
        if (!response.ok) {
          console.error('テーマ取得エラー:', response.statusText);
          // エラー時にはデフォルトテーマのみを設定
          setMarpThemes(['default']);
          return;
        }
        const data = await response.json();
        if (data.themes && Array.isArray(data.themes)) {
          setMarpThemes(data.themes);
          console.log('Marpテーマを取得しました:', data.themes);
        } else if (data.error) {
          // エラーがある場合はログ出力
          console.error('テーマ取得エラー:', data.error);
          // エラー時にもデフォルトテーマのみを設定
          setMarpThemes(['default']);
        } else {
          // 正しい形式でレスポンスが返ってこない場合
          console.error('不正なレスポンス形式:', data);
          setMarpThemes(['default']);
        }
      } catch (error) {
        console.error('テーマ取得中に例外が発生しました:', error);
        // エラー時にはデフォルトテーマのみを設定
        setMarpThemes(['default']);
      } finally {
        setIsLoadingThemes(false);
      }
    };

    fetchMarpThemes();
  }, []);

  // 設定マネージャの参照

  // 設定マネージャの参照
  const configManagerRef = useRef<HTMLDivElement>(null)
  const isConfigManagerVisible = useRef(false)

  // ref経由で公開するメソッド
  useImperativeHandle(ref, () => ({
    // viewModeを取得
    getViewMode: () => viewMode,
    // viewModeを設定
    setViewMode: (newViewMode: 'editor' | 'preview' | 'split' | 'triple' | 'marp-preview' | 'marp-split' | 'quarto-preview' | 'quarto-split' | 'markmap' | 'markmap-split') => {
      console.log('setViewMode が呼ばれました:', newViewMode);
      
      // AIチャット処理を特別に扱う
      if (newViewMode === 'triple') {
        // AIチャットに切り替える前に現在のビューモードを保存
        if (viewMode !== 'triple') {
          setPreviousViewMode(viewMode);
        }
      } else if (viewMode === 'triple') {
        // AIチャットからの復帰時
        if (previousViewMode && previousViewMode !== 'triple') {
          // DocumentManagerからの要求を上書きして、記憶していた前の状態に戻す
          console.log(`AIチャットから復帰します。要求されたモード:${newViewMode} → 復元するモード:${previousViewMode}`);
          newViewMode = previousViewMode;
        }
      }
      
      // プレビューモード名を先に決定（viewMode変更前に取得）
      const newPreviewModeName = (() => {
        if (typeof newViewMode === 'string' && newViewMode.includes('marp')) return 'Marp';
        if (typeof newViewMode === 'string' && newViewMode.includes('quarto')) return 'Quarto';
        if (typeof newViewMode === 'string' && newViewMode.includes('markmap')) return 'Markmap';
        if (typeof newViewMode === 'string' && (newViewMode.includes('preview') || newViewMode.includes('split'))) return 'Markdown';
        return null;
      })();
      
      console.log(`viewMode: ${viewMode} → ${newViewMode}, previewMode: ${newPreviewModeName}`);
      
      // viewModeの状態を更新
      setViewMode(newViewMode);
      
      // 親コンポーネントに通知（同期的に呼び出す）
      if (onEditorStateUpdate && viewRef.current) {
        try {
          // 現在のカーソル位置情報を取得
          const doc = viewRef.current.state.doc;
          const selection = viewRef.current.state.selection;
          
          if (doc && selection) {
            const head = selection.main.head;
            const line = doc.lineAt(head).number;
            const lineStart = doc.lineAt(head).from;
            const col = head - lineStart + 1;
            
            console.log(`親コンポーネントに通知: viewMode=${newViewMode}, previewType=${newPreviewModeName}`);
            
            // 親コンポーネントに通知
            onEditorStateUpdate(
              { line, col },
              outputMode,
              newPreviewModeName,
              isVimMode
            );
          }
        } catch (err) {
          console.error('エディタ状態の取得中にエラーが発生しました:', err);
        }
      }
    },
    // エディタのコンテンツを取得
    getContent: () => markdownContent,
    // 選択中のテキストを取得
    getSelectedContent: getSelectedEditorContentCallback,
    // 選択中のテキストを置換
    replaceSelectedContent: replaceSelectedEditorContentCallback
  }));
  
  // Marp関連の設定
  const [marpTheme, setMarpTheme] = useState("default")

  // プレビューモードが変更されたときに左サイドバーのアクティブ状態を更新
  useEffect(() => {
    // プレビューモードが変更されたときにサイドバーアイコンのフォーカスを更新
    console.log(`プレビューモードが変更されました: ${getPreviewModeName()}`);
    // 実際の処理はレンダリング時の条件式で行うため、ここでは特に何もしない
  }, [viewMode]);

  // --- ▼ MODIFIED ▼ ---
  // このuseEffectによる2回目の更新を防ぐため、コメントアウト
  /*
  useEffect(() => {
    // 親コンポーネントに状態情報を通知
    if (onEditorStateUpdate) {
      const previewModeStr = getPreviewModeName();
      onEditorStateUpdate(
        cursorPosition,
        outputMode,
        previewModeStr,
        isVimMode
      );
    }
  }, [cursorPosition, outputMode, viewMode, isVimMode, onEditorStateUpdate]);
  */
  // --- ▲ MODIFIED ▲ ---

  // 音声入力の状態を親コンポーネントに通知
  useEffect(() => {
    if (onVoiceInputStateChange) {
      onVoiceInputStateChange(isListening, toggleSpeechRecognition);
    }
  }, [isListening, toggleSpeechRecognition, onVoiceInputStateChange]);

  // Vimモードの状態を親コンポーネントに通知
  useEffect(() => {
    if (onVimModeStateChange) {
      onVimModeStateChange(isVimMode, toggleVimMode);
    }
  }, [isVimMode, toggleVimMode, onVimModeStateChange]);

  // ファイルエクスプローラーの表示/非表示を切り替える関数
  const toggleFileExplorer = useCallback(() => {
    // FILE_UPLOADがOFFの場合は何もしない
    if (process.env.NEXT_PUBLIC_FILE_UPLOAD === 'OFF') {
      console.log('FILE_UPLOAD=OFFのため、ファイルエクスプローラーは使用できません');
      return;
    }
    
    setIsFileExplorerVisible(prev => {
      console.log(`ファイルエクスプローラーの表示を切り替えます: ${!prev ? '表示' : '非表示'}`);
      return !prev;
    });
  }, []);
  
  // ローカルファイル選択時の処理
  const handleLocalFileSelect = useCallback(async (filePath: string, fileName: string) => {
    try {
      console.log(`ファイル読み込み開始: ${filePath} (${fileName})`);
      const url = `/api/files/read?path=${encodeURIComponent(filePath)}`;
      console.log(`API呼び出し: ${url}`);
      
      const response = await fetch(url);
      console.log(`API応答ステータス: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('APIエラーレスポンス:', errorData);
        throw new Error(errorData.error || `ファイル読み込みエラー: ${response.statusText}`);
      }
      
      // JSONレスポンスを取得
      const data = await response.json();
      
      // APIから返されたファイル名を使用（日本語ファイル名対応）
      const displayFileName = data.fileName || fileName;
      
      // Base64エンコードされたコンテンツをデコード
      let content = '';
      if (data.contentBase64 && data.encoding === 'base64') {
        try {
          // Base64からデコード - UTF-8対応の方法でデコード
          const binaryStr = atob(data.contentBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          // UTF-8としてデコード
          content = new TextDecoder('utf-8').decode(bytes);
          console.log(`Base64からUTF-8としてデコードしました (${content.length}文字)`);
        } catch (decodeError) {
          console.error('Base64デコードエラー:', decodeError);
          throw new Error('ファイルのデコードに失敗しました');
        }
      } else if (data.content) {
        // 古い形式のレスポンス対応（後方互換性）
        content = data.content;
        console.log(`通常形式のコンテンツを取得 (${content.length}文字)`);
      } else {
        throw new Error('ファイルの内容を取得できませんでした');
      }
      
      // 新規タブでファイルを開く
      if (onOpenFileInNewTab) {
        console.log(`新規タブでファイル「${displayFileName}」を開きます`);
        const newTabId = await onOpenFileInNewTab(filePath, displayFileName, content);
        console.log(`新規タブ作成完了 - タブID: ${newTabId}`);
      } else {
        // 後方互換性のため、従来の方法でも対応（新規タブ機能がない場合）
        console.log(`現在のタブでファイル「${displayFileName}」を開きます（後方互換モード）`);
        setMarkdownContent(content);
        
        if (onFileSaved) {
          console.log(`ファイル名をタブに設定: ${displayFileName}`);
          onFileSaved(displayFileName);
        }
      }
      
      // 成功メッセージを表示
      console.log(`ファイル「${displayFileName}」読み込み完了`);
      alert(`ファイル「${displayFileName}」を読み込みました`);
    } catch (error) {
      console.error('ファイル読み込みエラー詳細:', error);
      // エラーもアラートで表示
      alert(error instanceof Error ? `エラー: ${error.message}` : "ファイルを読み込めませんでした");
    }
  }, [setMarkdownContent, onFileSaved, onOpenFileInNewTab]);

  // --- Render ---
  return (
    <div className={`fixed inset-0 flex ${isDarkMode ? 'bg-[#1e1e1e] text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* --- ▼ ADDED ▼ --- */}
      <style>{scrollbarStyle}</style>
      {/* --- ▲ ADDED ▲ --- */}
      {/* --- Sidebar (Left) --- */}
      {/* ▼ MODIFIED: w-14 を w-12 に変更 */}
      {/* ▼ MODIFIED: ダークモードの背景色を #171717 に変更 */}
      <div className={`w-9 flex flex-col items-center py-4 space-y-4 border-r ${isDarkMode ? 'dark:bg-[#171717] dark:border-[#171717]' : 'bg-gray-100 border-gray-300'}`}>
        <TooltipProvider>
          {/* Mode Buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              {/* ▼ MODIFIED: 選択時の背景色を dark:bg-[#2F2F2F] に */}
              <Button 
                variant={getPreviewModeName() === 'Markdown' ? 'secondary' : outputMode === 'markdown' && getPreviewModeName() !== 'Marp' && getPreviewModeName() !== 'Quarto' && getPreviewModeName() !== 'Markmap' ? 'secondary' : 'ghost'} 
                size="icon" 
                className={`h-10 w-10 ${(getPreviewModeName() === 'Markdown' || (outputMode === 'markdown' && getPreviewModeName() !== 'Marp' && getPreviewModeName() !== 'Quarto' && getPreviewModeName() !== 'Markmap')) && isDarkMode ? 'dark:bg-[#2F2F2F]' : ''}`} 
                onClick={() => handleModeChange('markdown')}
              >
                <FileText className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Markdown Mode</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* ▼ MODIFIED: 選択時の背景色を dark:bg-[#2F2F2F] に */}
              <Button 
                variant={getPreviewModeName() === 'Marp' ? 'secondary' : outputMode === 'marp' && getPreviewModeName() !== 'Markdown' && getPreviewModeName() !== 'Quarto' && getPreviewModeName() !== 'Markmap' ? 'secondary' : 'ghost'} 
                size="icon" 
                className={`h-10 w-10 ${(getPreviewModeName() === 'Marp' || (outputMode === 'marp' && getPreviewModeName() !== 'Markdown' && getPreviewModeName() !== 'Quarto' && getPreviewModeName() !== 'Markmap')) && isDarkMode ? 'dark:bg-[#2F2F2F]' : ''}`} 
                onClick={() => handleModeChange('marp')}
              >
                <Presentation className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Marp Mode</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* ▼ MODIFIED: 選択時の背景色を dark:bg-[#2F2F2F] に */}
              <Button 
                variant={getPreviewModeName() === 'Quarto' ? 'secondary' : outputMode === 'quarto' && getPreviewModeName() !== 'Markdown' && getPreviewModeName() !== 'Marp' && getPreviewModeName() !== 'Markmap' ? 'secondary' : 'ghost'} 
                size="icon" 
                className={`h-10 w-10 ${(getPreviewModeName() === 'Quarto' || (outputMode === 'quarto' && getPreviewModeName() !== 'Markdown' && getPreviewModeName() !== 'Marp' && getPreviewModeName() !== 'Markmap')) && isDarkMode ? 'dark:bg-[#2F2F2F]' : ''}`} 
                onClick={() => handleModeChange('quarto')}
              >
                <FileChartColumn className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Quarto Mode</TooltipContent>
          </Tooltip>

          <div className="w-full border-t my-2"></div>

          {/* ファイルエクスプローラーボタンを追加 */}
          {process.env.NEXT_PUBLIC_FILE_UPLOAD !== 'OFF' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={isFileExplorerVisible ? 'secondary' : 'ghost'} 
                  size="icon" 
                  className={`h-10 w-10 ${isFileExplorerVisible && isDarkMode ? 'dark:bg-[#2F2F2F]' : ''}`} 
                  onClick={toggleFileExplorer}
                >
                  <Folder className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">ファイルエクスプローラー</TooltipContent>
            </Tooltip>
          )}

          {/* ▲ ADDED ▲ */}
        </TooltipProvider>
      </div>

      {/* --- Main Content Area --- */}
      {/* ▼ MODIFIED: flex-grow を追加してメインエリアを伸縮可能にする */}
      <div className="flex flex-col flex-grow overflow-hidden">
        {/* --- Menu Bar (Top) --- */}
        {/* ▼ REMOVED: トップメニューバー全体を削除 ▼ */}
        {/*
        <div className={`flex justify-between items-center px-4 py-2 border-b shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
          <h1 className="text-lg font-semibold">Markdown Editor</h1>
          <div className="flex items-center space-x-2">
            // ... (削除されるボタンたち) ...
          </div>
        </div>
        */}
        {/* ▲ REMOVED: トップメニューバー全体を削除 ▲ */}

        {/* --- Toolbar --- */}
        {/* ▼ MODIFIED: py-1 を py-0.5 に変更 */}
        {/* ▼ MODIFIED: ダークモードの背景色を black に、ボーダー色を gray-800 に変更 */}
        <div className={`bg-muted dark:bg-[#171717] pl-1 pr-2 py-0.5 flex justify-between items-center border-b shrink-0 ${isDarkMode ? 'dark:border-[#171717]' : 'border-gray-300'} overflow-x-auto whitespace-nowrap`}>
          <TooltipProvider>
            {/* 左側の要素 */}
            <div className="flex space-x-0 items-center">
              {/* タブリスト - 左詰め */}
              <div className="flex items-center overflow-hidden mr-2" style={{ maxWidth: '550px' }}>
                <div className="overflow-x-auto overflow-y-hidden scrollbar-hide" style={{ maxWidth: '550px', flexShrink: 0, paddingLeft: 0 }}>
                  <style jsx global>{`
                    /* スクロールバーを強制的に非表示 */
                    .tabs-container::-webkit-scrollbar {
                      display: none !important;
                      width: 0 !important;
                      height: 0 !important;
                    }
                    .tabs-container {
                      -ms-overflow-style: none !important;
                      scrollbar-width: none !important;
                      overflow-y: hidden !important;
                    }
                    /* 横スクロールバーも非表示 */
                    .horizontal-tabs {
                      -ms-overflow-style: none !important;
                      scrollbar-width: none !important;
                    }
                    .horizontal-tabs::-webkit-scrollbar {
                      display: none !important;
                      width: 0 !important;
                      height: 0 !important;
                    }
                  `}</style>
                  {tabs.length > 0 && (
                    <Tabs value={activeTabId} onValueChange={onTabChange} className="w-full">
                      <TabsList className="h-7 flex justify-start bg-transparent tabs-container">
                        {tabs.map((tab) => {
                          const [isEditing, setIsEditing] = useState(false);
                          const [editValue, setEditValue] = useState(tab.title);
                          const inputRef = useRef<HTMLInputElement>(null);
                          
                          const startEditing = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setIsEditing(true);
                            setEditValue(tab.title);
                            
                            // フォーカスを遅延設定（DOMが更新された後）
                            setTimeout(() => {
                              if (inputRef.current) {
                                inputRef.current.focus();
                                inputRef.current.select();
                              }
                            }, 50);
                          };
                          
                          const confirmEdit = (e?: React.MouseEvent | React.FormEvent) => {
                            if (e) e.stopPropagation();
                            if (editValue.trim() !== '' && onUpdateTabTitle) {
                              onUpdateTabTitle(tab.id, editValue.trim());
                            }
                            setIsEditing(false);
                          };
                          
                          const handleKeyDown = (e: React.KeyboardEvent) => {
                            if (e.key === 'Enter') {
                              confirmEdit();
                            } else if (e.key === 'Escape') {
                              setIsEditing(false);
                            }
                          };
                          
                          return (
                            <TabsTrigger 
                              key={tab.id}
                              value={tab.id}
                              className={cn(
                                "h-7 px-2 text-xs text-muted-foreground/90 data-[state=active]:bg-muted/80 data-[state=active]:text-foreground flex items-center gap-1 relative group",
                                tab.isUnsaved && "after:content-['*'] after:ml-0.5"
                              )}
                              style={{ width: '100px', minWidth: '100px', maxWidth: '100px', flexShrink: 0 }}
                              onClick={() => !isEditing && onTabChange && onTabChange(tab.id)}
                            >
                              {isEditing ? (
                                <form 
                                  onSubmit={confirmEdit}
                                  onClick={(e) => e.stopPropagation()} 
                                  className="flex items-center w-full"
                                >
                                  <input
                                    ref={inputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={confirmEdit}
                                    className="h-5 w-full py-0 px-1 text-xs bg-background border border-input rounded"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </form>
                              ) : (
                                <>
                                  <span className="truncate">{tab.title}</span>
                                  <div className="opacity-0 group-hover:opacity-100 inline-flex ml-auto">
                                    {tab.id === activeTabId && (
                                      <button
                                        type="button"
                                        className="h-4 w-4 p-0 flex items-center justify-center rounded-full hover:bg-muted-foreground/20"
                                        onClick={startEditing}
                                        aria-label="Edit tab name"
                                      >
                                        <Pencil className="h-2.5 w-2.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="h-4 w-4 p-0 ml-0.5 flex items-center justify-center rounded-full hover:bg-muted-foreground/20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTabClose && onTabClose(tab.id);
                                      }}
                                      aria-label="Close tab"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </TabsTrigger>
                          );
                        })}
                        {onTabAdd && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-sm flex-shrink-0 text-muted-foreground/90 hover:text-foreground"
                            onClick={onTabAdd}
                            aria-label="New tab"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </TabsList>
                    </Tabs>
                  )}
                </div>
              </div>
              
              {(showToolbarButton('Marp Header') || showToolbarButton('Quatro Header')) && (
                <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-[#171717] p-1 rounded-md mr-1 flex-shrink-0">
                  {showToolbarButton('Marp Header') && (
                    <DropdownMenu>
 
                      <DropdownMenuContent align="start">
                        {isLoadingThemes ? (
                          <div className="flex items-center justify-center py-2 px-4 text-sm text-muted-foreground">
                            <span className="animate-spin mr-2">⌛</span>テーマ読み込み中...
                          </div>
                        ) : marpThemes.length > 0 ? (
                          marpThemes.map((theme) => (
                            <DropdownMenuItem 
                              key={theme} 
                              onClick={() => insertMarpHeader(theme)}
                              className={selectedMarpTheme === theme ? "font-bold bg-muted" : ""}
                            >
                              {theme}
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <div className="py-2 px-4 text-sm text-muted-foreground">
                            テーマが見つかりませんでした
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {showToolbarButton('Quatro Header') && <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertText(`---\ntitle: "Quarto Basics"\nformat:\n html:\n  code-fold: true\njupyter: python3\n---\n\n`, "")}><FileCode className="h-4 w-4" /></Button>
                    </TooltipTrigger><TooltipContent>Quarto Header</TooltipContent>
                  </Tooltip>}
                </div>
              )}
            </div>

            {/* 右側の要素 */}
            <div className="flex items-center space-x-1">
              {/* View Mode Buttons */}
              {/* ▼ MODIFIED: ボタンサイズを h-7 w-7 に変更 */}
              {/* ▼ MODIFIED: グループ背景を dark:bg-[#171717] に */}
              {/* ▼ MODIFIED: 選択中ボタンの背景色を dark:bg-[#212121] に */}
              <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-[#171717] p-1 rounded-md mr-1 flex-shrink-0">
                <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'editor' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('editor')} className={`h-7 w-7 ${viewMode === 'editor' && isDarkMode ? 'dark:bg-[#212121]' : ''}`}><Code size={18} /></Button></TooltipTrigger><TooltipContent>Editor Only</TooltipContent></Tooltip>
                {outputMode === 'markdown' && (
                  <>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('preview')} className={`h-7 w-7 ${viewMode === 'preview' && isDarkMode ? 'dark:bg-[#212121]' : ''}`}><Box size={18} /></Button></TooltipTrigger><TooltipContent>Preview Only</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('split')} className={`h-7 w-7 ${viewMode === 'split' && isDarkMode ? 'dark:bg-[#212121]' : ''}`}><SplitSquareVertical size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Markdown)</TooltipContent></Tooltip>
                    {/* マインドマップ Split View ボタン */}
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'markmap-split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('markmap-split')} className={`h-7 w-7 ${viewMode === 'markmap-split' && isDarkMode ? 'dark:bg-[#212121]' : ''}`}><GitBranch size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Mindmap)</TooltipContent></Tooltip>
                  </>
                )}
                {outputMode === 'marp' && (
                  <>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'marp-preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('marp-preview')} className={`h-7 w-7 ${viewMode === 'marp-preview' && isDarkMode ? 'dark:bg-[#212121]' : ''}`}><Presentation size={18} /></Button></TooltipTrigger><TooltipContent>Marp Preview</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'marp-split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('marp-split')} className={`h-7 w-7 ${viewMode === 'marp-split' && isDarkMode ? 'dark:bg-[#212121]' : ''}`}><Columns size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Marp)</TooltipContent></Tooltip>
                  </>
                )}
                {outputMode === 'quarto' && (
                  <>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'quarto-preview' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('quarto-preview')} className={`h-7 w-7 ${viewMode === 'quarto-preview' && isDarkMode ? 'dark:bg-[#212121]' : ''}`}><FileChartColumn size={18} /></Button></TooltipTrigger><TooltipContent>Quarto Preview</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant={viewMode === 'quarto-split' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('quarto-split')} className={`h-7 w-7 ${viewMode === 'quarto-split' && isDarkMode ? 'dark:bg-[#212121]' : ''}`}><ChartColumn size={18} /></Button></TooltipTrigger><TooltipContent>Split View (Quarto)</TooltipContent></Tooltip>
                  </>
                )}
              </div>
              {/* Settings & Drive & Manuals */}
              {/* --- ▼ MODIFIED ▼ --- */}
              {/* マニュアルボタンの条件分岐を修正 */}
              {/* ▼ MODIFIED: ボタンサイズを h-7 w-7 に変更 */}
              {/* ▼ MODIFIED: グループ背景を dark:bg-[#171717] に */}
              <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-[#171717] p-1 rounded-md mr-1 flex-shrink-0">
                {/* 以下3つのボタンを削除: 音声入力ボタン、VIM ON/OFFボタン、Toc ON/OFFボタン */}
                {showToolbarButton('Toc ON/OFF') && <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isTocVisible ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={toggleToc}
                      className="h-7 w-7"
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
                        className={`h-7 w-7 ${driveEnabled ? 'text-blue-500' : ''}`}
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
                     <Button variant="ghost" size="icon" onClick={() => window.open(`/api/preview-markdown?path=${encodeURIComponent('/manual/marp_manual.md')}`, '_blank')} className="h-7 w-7">
                       <CircleHelp className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>Marpマニュアルを開く</TooltipContent>
                 </Tooltip>
                }
                {/* Quarto マニュアル */}
                {showToolbarButton('💡Quatro') && 
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" onClick={() => window.open(`/api/preview-markdown?path=${encodeURIComponent('/manual/quatro_manual.md')}`, '_blank')} className="h-7 w-7"> {/* quatro -> quarto */}
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
        {/* --- ▲ MODIFIED ▲ --- */}

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
        <div className="flex-grow overflow-hidden"> {/* overflow-auto から overflow-hidden に変更 */}
          {/* viewMode が 'triple' の場合のみ TripleLayout を使用、それ以外は通常のレイアウト */}
          {viewMode === 'triple' ? (
            <TripleLayout
              // EditorComponent を含む div に custom-scrollbar を追加
              editorComponent={<div className="h-full overflow-auto custom-scrollbar">{EditorComponent}</div>}
              previewComponent={
                // 各プレビューコンポーネントは自身のルートに custom-scrollbar がある
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
              // TOCコンポーネントを ScrollArea でラップし custom-scrollbar を追加
              tocComponent={
                (!driveEnabled && isTocVisible) ?
                <ScrollArea className="h-full w-full p-4 custom-scrollbar">
                  <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                </ScrollArea>
                : null
              }
              getEditorContent={getEditorContentCallback}
              getSelectedEditorContent={getSelectedEditorContentCallback}
              replaceSelectedEditorContent={replaceSelectedEditorContentCallback}
              setInput={setInput}
              append={append as any}
            />
          ) : (
             /* 通常のビューモード (triple以外) */
             viewMode.includes('editor') ? (
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {/* ファイルエクスプローラーを追加 */}
                  {isFileExplorerVisible && process.env.NEXT_PUBLIC_FILE_UPLOAD !== 'OFF' ? (
                    <>
                      <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                        <FileExplorer 
                          onFileSelect={handleLocalFileSelect} 
                          isDarkMode={isDarkMode} 
                          className="custom-scrollbar"
                        />
                      </ResizablePanel>
                      <ResizableHandle withHandle className={`${isDarkMode ? 'dark:bg-[#171717] dark:border-[#171717]' : ''}`} />
                    </>
                  ) : null}
                  
                  {/* 既存のドライブ/TOC条件 */}
                  {((driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible)) && !isFileExplorerVisible ? (
                    <>
                      <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                        {/* ScrollArea に custom-scrollbar を追加 */}
                        <ScrollArea className="h-full w-full p-4 custom-scrollbar">
                          {driveEnabled && isAuthenticated && accessToken ? (
                            <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                          ) : (
                            <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                          )}
                        </ScrollArea>
                      </ResizablePanel>
                      {/* ▼ MODIFIED: ResizableHandle にダークモード時の色を指定 */}
                      <ResizableHandle withHandle className="dark:bg-[#171717] dark:border-[#171717]" />
                    </>
                  ) : null}
                  <ResizablePanel defaultSize={isFileExplorerVisible || (driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 80 : 100}>
                    {/* EditorComponent を含む div に custom-scrollbar を追加 */}
                    <div className="h-full overflow-auto custom-scrollbar">{EditorComponent}</div>
                  </ResizablePanel>
                </ResizablePanelGroup>
             ) : viewMode.includes('preview') && !viewMode.includes('split') && !viewMode.includes('markmap') ? (
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {/* ファイルエクスプローラーを追加 */}
                  {isFileExplorerVisible && process.env.NEXT_PUBLIC_FILE_UPLOAD !== 'OFF' ? (
                    <>
                      <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                        <FileExplorer 
                          onFileSelect={handleLocalFileSelect} 
                          isDarkMode={isDarkMode} 
                          className="custom-scrollbar"
                        />
                      </ResizablePanel>
                      <ResizableHandle withHandle className={`${isDarkMode ? 'dark:bg-[#171717] dark:border-[#171717]' : ''}`} />
                    </>
                  ) : null}
                  
                  {/* 既存のドライブ/TOC条件 */}
                  {((driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible)) && !isFileExplorerVisible ? (
                    <>
                      <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                        {/* ScrollArea に custom-scrollbar を追加 */}
                        <ScrollArea className="h-full w-full p-4 custom-scrollbar">
                          {driveEnabled && isAuthenticated && accessToken ? (
                            <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                          ) : (
                            <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                          )}
                        </ScrollArea>
                      </ResizablePanel>
                      {/* ▼ MODIFIED: ResizableHandle にダークモード時の色を指定 */}
                      <ResizableHandle withHandle className="dark:bg-[#171717] dark:border-[#171717]" />
                    </>
                  ) : null}
                  <ResizablePanel defaultSize={isFileExplorerVisible || (driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 80 : 100}>
                    {viewMode.includes('marp') ? MarpPreviewComponent :
                     viewMode.includes('quarto') ? QuartoPreviewComponent :
                     viewMode.includes('markmap') ? MarkmapPreviewComponent :
                     PreviewComponent}
                  </ResizablePanel>
                </ResizablePanelGroup>
             ) : (
               /* Split View (デフォルト) */
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {/* ファイルエクスプローラーを追加 */}
                  {isFileExplorerVisible && process.env.NEXT_PUBLIC_FILE_UPLOAD !== 'OFF' ? (
                    <>
                      <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                        <FileExplorer 
                          onFileSelect={handleLocalFileSelect} 
                          isDarkMode={isDarkMode} 
                          className="custom-scrollbar"
                        />
                      </ResizablePanel>
                      <ResizableHandle withHandle className={`${isDarkMode ? 'dark:bg-[#171717] dark:border-[#171717]' : ''}`} />
                    </>
                  ) : null}
                  
                  {/* 既存のドライブ/TOC条件 */}
                  {((driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible)) && !isFileExplorerVisible ? (
                    <>
                      <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                        {/* ScrollArea に custom-scrollbar を追加 */}
                        <ScrollArea className="h-full w-full p-4 custom-scrollbar">
                          {driveEnabled && isAuthenticated && accessToken ? (
                            <GoogleDriveFileList accessToken={accessToken} onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
                          ) : (
                            <TableOfContents headings={extractedHeadings} onHeadingClick={handleTocJump} isDarkMode={isDarkMode} />
                          )}
                        </ScrollArea>
                      </ResizablePanel>
                      {/* ▼ MODIFIED: ResizableHandle にダークモード時の色を指定 */}
                      <ResizableHandle withHandle className="dark:bg-[#171717] dark:border-[#171717]" />
                    </>
                  ) : null}
                  
                  {/* エディターとプレビューのパネルサイズを調整 */}
                  <ResizablePanel defaultSize={isFileExplorerVisible || (driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 40 : 50}>
                    <div className="h-full overflow-auto custom-scrollbar">{EditorComponent}</div>
                  </ResizablePanel>
                  {/* ▼ MODIFIED: ResizableHandle にダークモード時の色を指定 */}
                  <ResizableHandle withHandle className="dark:bg-[#171717] dark:border-[#171717]" />
                  <ResizablePanel defaultSize={isFileExplorerVisible || (driveEnabled && isAuthenticated && accessToken) || (!driveEnabled && isTocVisible) ? 40 : 50}>
                    {viewMode.includes('marp') ? MarpPreviewComponent :
                     viewMode.includes('quarto') ? QuartoPreviewComponent :
                     viewMode.includes('markmap') ? MarkmapPreviewComponent :
                     PreviewComponent}
                  </ResizablePanel>
                </ResizablePanelGroup>
             )
          )}
        </div>
        {/* --- ▲ MODIFIED ▲ --- */}

        {/* --- Status Bar --- */}
        {/* ステータスバーはDocumentManagerとDocumentTabsに移動したため非表示
        <div className={`sticky bottom-0 left-0 right-0 p-1 border-t text-xs flex justify-between items-center shrink-0 z-10 ${isDarkMode ? 'dark:bg-[#171717] dark:border-[#171717] text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
          <div>Ln {cursorPosition.line}, Col {cursorPosition.col}</div>
          <div>
            <span>Mode: {outputMode.charAt(0).toUpperCase() + outputMode.slice(1)}</span>
            {getPreviewModeName() && <span className="ml-2">Preview: {getPreviewModeName()}</span>}
            {isVimMode && <span className="ml-2 font-bold text-green-500">VIM</span>}
          </div>
        </div>
        */}

        {/* Hidden file input for image upload */}
        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      </div> {/* End Main Content Area Flex Col */}

      {/* --- ▼ ADDED: Sidebar (Right) --- */}
      {/* ▼ MODIFIED: w-14 を w-12 に変更 */}
      {/* ▼ MODIFIED: ダークモードの背景色を #171717 に変更 */}
      <div className={`w-9 flex flex-col items-center py-4 space-y-4 border-l ${isDarkMode ? 'dark:bg-[#171717] dark:border-gray-800' : 'bg-gray-100 border-gray-300'}`}>
        <TooltipProvider>
          {/* Save Button */}
          <Tooltip>
                          <TooltipTrigger asChild>
                {/* ▼ MODIFIED: variant を ghost に変更 */}
                <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); handleSave(false); }} className="h-10 w-10" disabled={isSaving || (driveEnabled && !isAuthenticated)}>
                  {isSaving ? <span className="animate-spin">⌛</span> : <Save className="h-5 w-5" />}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{driveEnabled && isAuthenticated ? `Google Driveに保存 (${selectedFile?.name || '新規'})` : "ローカルに保存"}</TooltipContent>
          </Tooltip>

          {/* Quarto PDF Export Button (Conditional) */}
          {outputMode === 'quarto' && (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* ▼ MODIFIED: variant を ghost に変更 */}
                <Button variant="ghost" size="icon" onClick={handleExportToQuartoPdf} className="h-10 w-10" disabled={isQuartoPdfGenerating}>
                  {isQuartoPdfGenerating ? <span className="animate-spin">⌛</span> : <FileIcon className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">PDFとして出力 (Quarto)</TooltipContent>
            </Tooltip>
          )}

          {/* Export Button (Dynamic: PPTX/Print) */}
          {(outputMode === 'markdown' || outputMode === 'marp' || outputMode === 'quarto') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* ▼ MODIFIED: variant を ghost に変更 */}
                  <Button variant="ghost" size="icon" onClick={handleExport} className="h-10 w-10" disabled={isExporting}>
                    {isExporting ? <span className="animate-spin">⌛</span> : getExportButtonProps().icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{getExportButtonProps().tooltip}</TooltipContent>
              </Tooltip>
          )}

          {/* ▼ ADDED: スペーサーと移動したボタン ▼ */}
          <div className="flex-grow" /> {/* このスペーサーがボタンを下部に押しやる */}

          {/* Google Login/Status (Moved) */}
          {process.env.NEXT_PUBLIC_GOOGLE_FLAG !== 'OFF' && (
            <Tooltip>
              <TooltipTrigger asChild>
                 <GoogleAuth onAuthChange={handleAuthChange} />
              </TooltipTrigger>
              {/* side を left に変更 */}
              <TooltipContent side="left">{isAuthenticated ? "Googleからログアウト" : "Googleにログイン"}</TooltipContent>
            </Tooltip>
          )}

          {/* 全画面表示切替ボタン */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleFullScreen} className="h-10 w-10">
                {isFullScreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{isFullScreen ? "全画面表示を終了" : "全画面表示に切替"}</TooltipContent>
          </Tooltip>

          {/* Dark Mode Toggle (Moved) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-10 w-10">
                {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
              </Button>
            </TooltipTrigger>
            {/* side を left に変更 */}
            <TooltipContent side="left">{isDarkMode ? "ライトモードに切替" : "ダークモードに切替"}</TooltipContent>
          </Tooltip>
          {/* ▲ ADDED ▲ */}
        </TooltipProvider>
      </div>
      {/* --- ▲ ADDED: Sidebar (Right) --- */}

    </div> /* End Top Level Flex Container */
  )
})

export default MarkdownEditor

