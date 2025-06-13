"use client"

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DocumentTabs, DocumentTab } from './document-tabs'
import MarkdownEditor from './markdown-editor'
import { TripleLayout } from './triple-layout'
import { useChat } from 'ai/react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

// デフォルトのMarkdownコンテンツ
const DEFAULT_CONTENT = "# Hello, World!\n\n## Section 1\nSome text\n\n## Section 2\nMore text"

// ローカルストレージのキー
const STORAGE_KEY = 'markdown-app-tabs'
// 初回アクセスフラグのキー
const FIRST_ACCESS_KEY = 'markdown-app-first-access'
// 設定のキー
const SETTINGS_KEY = 'markdown-app-settings'
// デフォルトの復元タブ数
const DEFAULT_RESTORE_TABS_COUNT = 5

// アプリケーション設定の型定義
interface AppSettings {
  restoreTabsCount: number; // 復元するタブの数
}

// デフォルト設定
const DEFAULT_SETTINGS: AppSettings = {
  restoreTabsCount: DEFAULT_RESTORE_TABS_COUNT
}

// デフォルトタブの生成関数
const createDefaultTab = (): DocumentTab => ({
  id: uuidv4(),
  title: 'Untitled',
  content: '# New Document\n\nStart writing here...',
  isUnsaved: false,
  previewType: 'Markdown' // デフォルトのプレビュータイプ
});

export default function DocumentManager() {
  // テーマの状態を next-themes から取得
  const { theme, setTheme } = useTheme()
  // isDarkMode の状態をアプリケーション全体で管理
  const [isDarkMode, setIsDarkMode] = useState(false)
  // 初回アクセスフラグ
  const [isFirstAccess, setIsFirstAccess] = useState(true)
  // アプリケーション設定
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  // 設定の読み込みが完了したかどうか
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // テーマが変更されたときに isDarkMode を更新
  useEffect(() => {
    setIsDarkMode(theme === 'dark')
  }, [theme])

  // ダークモード切り替え関数
  const toggleDarkMode = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [theme, setTheme])

  // タブの状態管理
  const [tabs, setTabs] = useState<DocumentTab[]>([])  // 空の配列で初期化
  const [activeTabId, setActiveTabId] = useState<string>('')  // 空文字列で初期化
  const [isInitialized, setIsInitialized] = useState(false) // 初期化完了フラグ
  
  // エディタの状態管理
  const [cursorPosition, setCursorPosition] = useState<{ line: number, col: number }>({ line: 1, col: 1 })
  const [outputMode, setOutputMode] = useState<string>('Markdown')
  const [previewMode, setPreviewMode] = useState<string | null>(null)
  
  // ターミナル・Vim・音声入力の状態管理
  const [terminalVisible, setTerminalVisible] = useState(false)
  const [isVimMode, setIsVimMode] = useState<boolean>(false)
  const [isListening, setIsListening] = useState<boolean>(false)
  const [toggleVoiceInput, setToggleVoiceInput] = useState<(() => void) | undefined>(undefined)
  const [toggleVimMode, setToggleVimMode] = useState<(() => void) | undefined>(undefined)

  // ターミナル切り替え関数
  const toggleTerminal = useCallback(() => {
    setTerminalVisible(prev => !prev)
  }, [])

  // エディタからの挿入関数を保存するref
  const editorInsertFunctionRef = useRef<((text: string) => void) | null>(null)

  // エディタから挿入関数を受け取る
  const handleReceiveInsertFunction = useCallback((insertFunction: (text: string) => void) => {
    editorInsertFunctionRef.current = insertFunction
  }, [])

  // ターミナルからエディタへのテキスト挿入機能
  const handleTerminalInsertToEditor = useCallback((text: string) => {
    if (editorInsertFunctionRef.current) {
      editorInsertFunctionRef.current(text)
    }
  }, [])
  
  // エディタへの参照
  const editorRef = useRef<any>(null)
  
  // タブ切替時に前回のpreviewTypeを復元する処理を行うための状態変数
  const [ignoreNextPreviewUpdate, setIgnoreNextPreviewUpdate] = useState<boolean>(false);
  
  // 最後にエディタの状態変更により更新されたタブID
  const [lastUpdatedTabId, setLastUpdatedTabId] = useState<string | null>(null);
  
  // エディタからの情報更新のためのコールバック関数
  const handleEditorStateUpdate = useCallback((
    cursorPos: { line: number, col: number },
    mode: string,
    preview: string | null,
    vimMode: boolean
  ) => {
    // 基本的な状態更新
    setCursorPosition(cursorPos)
    setOutputMode(mode)
    setPreviewMode(preview)
    setIsVimMode(vimMode)
    
    // プレビュータイプが変更されたら、現在のタブのpreviewTypeを更新
    // ただし、タブ切替時の自動更新は無視する
    if (activeTabId && preview !== null) {
      if (ignoreNextPreviewUpdate) {
        console.log('フラグがONのため、プレビュータイプの更新をスキップします:', preview, 'タブID:', activeTabId);
        return; // 更新をスキップ
      }
      
      console.log('プレビュータイプを更新します:', preview, 'タブID:', activeTabId);
      
      // このタブIDを最後に更新されたタブIDとして記録
      setLastUpdatedTabId(activeTabId);
      
      // 現在のタブ一覧をコピーして操作する（直接変更を防ぐため）
      setTabs(prevTabs => {
        // 更新対象のタブを見つける
        const tabToUpdate = prevTabs.find(tab => tab.id === activeTabId);
        
        if (!tabToUpdate) {
          console.warn('更新対象のタブが見つかりません:', activeTabId);
          return prevTabs; // 変更なし
        }
        
        // 現在のプレビュータイプと異なる場合のみ更新
        if (tabToUpdate.previewType === preview) {
          console.log(`タブ "${tabToUpdate.title}" のプレビュータイプは既に "${preview}" なので更新をスキップします`);
          return prevTabs; // 変更なし
        }
        
        // タブのプレビュータイプを更新
        console.log(`タブ "${tabToUpdate.title}" のプレビュータイプを "${tabToUpdate.previewType || 'なし'}" から "${preview}" に更新します`);
        
        // 新しいタブ配列を作成（参照を変更するため）
        return prevTabs.map(tab => {
          if (tab.id === activeTabId) {
            // プレビュータイプのみを更新し、isUnsavedは既存の値を維持
            return { 
              ...tab, 
              previewType: preview 
              // isUnsavedは明示的に指定せずスプレッド演算子で継承
            };
          }
          return tab;
        });
      });
    }
  }, [activeTabId, ignoreNextPreviewUpdate]);
  
  // AIチャット関連 - グローバルレベルで管理
  const chatHelpers = useChat({
    api: '/api/chat',
    // フロントエンド側のタイムアウトを600秒（10分）に大幅延長
    fetch: (url, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[Frontend] フロントエンド側タイムアウト発生 (600秒)');
        controller.abort();
      }, 600000); // 600秒 = 10分
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).then(response => {
        console.log('[Frontend] レスポンス受信:', response.status, response.statusText);
        return response;
      }).catch(error => {
        console.error('[Frontend] Fetch エラー:', error);
        throw error;
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
    onError: (error) => {
      console.error('[useChat] エラー:', error);
    },
    onFinish: (message) => {
      console.log('[useChat] 完了:', message);
    },
  })
  
  // デフォルトタブの初期化 - 初期化プロセスの詳細をログに追加
  const initializeDefaultTab = useCallback(() => {
    const defaultTab = createDefaultTab();
    console.log('作成されたデフォルトタブ:', defaultTab);
    setTabs([defaultTab]);
    setActiveTabId(defaultTab.id);
    
    // ローカルストレージに保存
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultTab]));
      console.log('デフォルトタブをローカルストレージに保存しました');
    } catch (err) {
      console.error('デフォルトタブの保存に失敗しました:', err);
    }
  }, [])
  
  // アクティブなタブのコンテンツを取得
  const getActiveTabContent = useCallback(() => {
    if (!isInitialized) return DEFAULT_CONTENT;
    const activeTab = tabs.find(tab => tab.id === activeTabId)
    return activeTab ? activeTab.content : ''
  }, [tabs, activeTabId, isInitialized])
  
  // ローカルストレージから設定を読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('設定の読み込みを開始します...');
      const savedSettingsJson = localStorage.getItem(SETTINGS_KEY)
      console.log('保存された設定データ:', savedSettingsJson);
      
      if (savedSettingsJson) {
        const savedSettings = JSON.parse(savedSettingsJson) as AppSettings
        console.log('パースされた設定データ:', savedSettings);
        setSettings(savedSettings)
        console.log('ローカルストレージから設定を読み込みました:', savedSettings)
      } else {
        console.log('保存された設定が見つかりません。デフォルト設定を使用します:', DEFAULT_SETTINGS);
      }
      // 設定の読み込みが完了したことを記録
      setSettingsLoaded(true)
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error)
      // エラーが発生しても読み込み完了フラグをセット
      setSettingsLoaded(true)
    }
  }, []) // 空の依存配列で初期化時のみ実行
  
  // 設定の変更をローカルストレージに保存
  useEffect(() => {
    if (typeof window === 'undefined' || !settingsLoaded) return;
    
    try {
      console.log('設定の保存を開始します...');
      console.log('保存する設定データ:', settings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      console.log('ローカルストレージに設定を保存しました:', settings)
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
    }
  }, [settings, settingsLoaded]) // settingsLoaded を依存配列に追加
  
  // 初期化時にすべてのタブにpreviewTypeプロパティがあることを確認
  const initializeTabsWithPreviewType = useCallback((loadedTabs: DocumentTab[]): DocumentTab[] => {
    return loadedTabs.map(tab => {
      if (tab.previewType === undefined) {
        console.log(`タブ "${tab.title}" にpreviewTypeを追加: 'Markdown'`);
        return { ...tab, previewType: 'Markdown' };
      }
      return tab;
    });
  }, []);

  // ローカルストレージからタブ情報を読み込む
  useEffect(() => {
    if (typeof window === 'undefined' || !settingsLoaded) return;
    
    try {
      console.log('タブデータの読み込みを開始します...');
      console.log('現在の設定:', settings);
      
      // 初回アクセスフラグを確認
      const firstAccessFlag = localStorage.getItem(FIRST_ACCESS_KEY)
      console.log('初回アクセスフラグ:', firstAccessFlag);
      setIsFirstAccess(firstAccessFlag !== 'false')
      
      // タブデータを読み込む
      const savedTabsJson = localStorage.getItem(STORAGE_KEY)
      console.log('保存されたタブデータ:', savedTabsJson ? `${savedTabsJson.slice(0, 100)}...` : 'なし');
      
      if (savedTabsJson) {
        const savedTabs = JSON.parse(savedTabsJson) as DocumentTab[]
        console.log('パースされたタブデータ:', savedTabs.length, '個のタブ');
        
        if (savedTabs && savedTabs.length > 0) {
          // 設定に応じてタブ数を制限
          console.log('復元するタブ数の設定値:', settings.restoreTabsCount);
          const limitedTabs = savedTabs.slice(0, settings.restoreTabsCount)
          console.log('復元するタブデータ:', limitedTabs.length, '個のタブ');
          
          // タブにpreviewTypeフィールドがない場合はデフォルト値'Markdown'を設定
          const updatedTabs = initializeTabsWithPreviewType(limitedTabs);
          
          // タブデータを詳細にログ出力
          updatedTabs.forEach((tab, index) => {
            console.log(`タブ ${index + 1}: ID=${tab.id}, タイトル=${tab.title}, プレビュータイプ=${tab.previewType || 'なし'}`);
          });
          
          setTabs(updatedTabs)
          setActiveTabId(updatedTabs[0].id)
          console.log('ローカルストレージからタブデータを読み込みました:', updatedTabs.length, '個のタブ (全', savedTabs.length, '個中)')
        } else {
          console.log('有効なタブデータがありません。デフォルトタブを使用します。');
          initializeDefaultTab();
        }
      } else {
        console.log('保存されたタブデータが見つかりません。デフォルトタブを使用します。');
        initializeDefaultTab();
      }
      
      // 初回アクセスフラグを更新
      localStorage.setItem(FIRST_ACCESS_KEY, 'false')
      console.log('初回アクセスフラグを更新しました。');
      
      // 古いdraft_エントリを削除するクリーンアップ処理
      try {
        console.log('古いdraft_エントリのクリーンアップを開始します...');
        let deletedCount = 0;
        const allKeys = Object.keys(localStorage);
        
        // draft_で始まるすべてのキーとlastDraftIdを削除
        // 注: lastDraftIdは将来的に削除される予定の古い機能です
        allKeys.forEach(key => {
          if (key.startsWith('draft_') || key === 'lastDraftId') {
            localStorage.removeItem(key);
            deletedCount++;
          }
        });
        
        if (deletedCount > 0) {
          console.log(`クリーンアップ完了: ${deletedCount}個の古いdraft_エントリを削除しました`);
        } else {
          console.log('削除すべき古いdraft_エントリは見つかりませんでした');
        }
      } catch (cleanupError) {
        console.error('draft_エントリのクリーンアップ中にエラーが発生しました:', cleanupError);
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('タブデータの読み込みに失敗しました:', error)
      initializeDefaultTab();
      setIsInitialized(true);
    }
  }, [settingsLoaded, settings, initializeDefaultTab, initializeTabsWithPreviewType])
  
  // デバッグ用: タブの状態が変わったときにログ出力
  useEffect(() => {
    if (isInitialized && tabs.length > 0) {
      console.log('タブの状態が更新されました:', tabs.length, '個のタブ');
      tabs.forEach((tab, index) => {
        const isActive = tab.id === activeTabId;
        console.log(`タブ ${index + 1}: ID=${tab.id}, タイトル=${tab.title}, プレビュータイプ=${tab.previewType || 'なし'}${isActive ? ' (アクティブ)' : ''}`);
      });
    }
  }, [tabs, activeTabId, isInitialized]);
  
  // タブの変更をローカルストレージに保存
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized || tabs.length === 0) return;
    
    try {
      console.log('タブデータの保存を開始します...', tabs.length, '個のタブ');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
      console.log('ローカルストレージにタブデータを保存しました:', tabs.length, '個のタブ')
    } catch (error) {
      console.error('タブデータの保存に失敗しました:', error)
    }
  }, [tabs, isInitialized])
  
  // タブ追加ハンドラ
  const handleAddTab = useCallback(() => {
    console.log('新しいタブを追加します');
    const newTab: DocumentTab = {
      id: uuidv4(),
      title: 'Untitled',
      content: '# New Document\n\nStart writing here...',
      isUnsaved: false,
      previewType: 'Markdown' // デフォルトのプレビュータイプ
    }
    
    console.log('作成された新しいタブ:', newTab);
    setTabs(prev => {
      const updatedTabs = [...prev, newTab];
      // ローカルストレージに保存
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTabs));
        console.log('新しいタブをローカルストレージに保存しました');
      } catch (err) {
        console.error('タブの保存に失敗しました:', err);
      }
      return updatedTabs;
    })
    setActiveTabId(newTab.id)
  }, [])
  
  // タブ閉じるハンドラ
  const handleCloseTab = useCallback((tabId: string) => {
    console.log('タブを閉じようとしています:', tabId);
    
    try {
      // 閉じるタブがアクティブの場合は別のタブをアクティブにする
      if (activeTabId === tabId) {
        const activeIndex = tabs.findIndex(tab => tab.id === tabId)
        console.log('閉じるタブのインデックス:', activeIndex);
        const newActiveIndex = activeIndex > 0 ? activeIndex - 1 : (tabs.length > 1 ? 1 : 0)
        
        // 閉じるタブが唯一のタブでない場合のみアクティブタブを変更
        if (tabs.length > 1) {
          console.log('新しくアクティブにするタブ:', tabs[newActiveIndex].id, tabs[newActiveIndex].title);
          setActiveTabId(tabs[newActiveIndex].id)
        }
      }
      
      // ローカルストレージから該当のタブを削除した配列を作成
      const updatedTabs = tabs.filter(tab => tab.id !== tabId);
      console.log('タブを削除後の残りのタブ数:', updatedTabs.length);
      
      // タブを閉じる
      setTabs(updatedTabs);
      
      // すべてのタブが閉じられた場合は新しいタブを作成
      if (tabs.length <= 1) {
        console.log('最後のタブを閉じました。新しいデフォルトタブを作成します。');
        // 新しいタブを作成
        const newTab = createDefaultTab();
        setTabs([newTab]);
        setActiveTabId(newTab.id);
        console.log('新しいデフォルトタブを作成しました:', newTab.id);
      }
      
      console.log('タブを正常に閉じました:', tabId);
    } catch (error) {
      console.error('タブを閉じる処理でエラーが発生しました:', error);
      // エラー発生時にも最低限の処理を実行
      if (tabs.length <= 1) {
        const newTab = createDefaultTab();
        setTabs([newTab]);
        setActiveTabId(newTab.id);
      } else {
        setTabs(prev => prev.filter(tab => tab.id !== tabId));
      }
    }
  }, [tabs, activeTabId])
  
  // コンテンツ更新ハンドラ
  const handleContentUpdate = useCallback((content: string) => {
    console.log('コンテンツ更新:', activeTabId);
    
    setTabs(prev => {
      // 現在のタブ情報を取得（デバッグ用）
      const currentTab = prev.find(tab => tab.id === activeTabId);
      const isChanged = currentTab && currentTab.content !== content;
      
      console.log(`タブ内容更新: ID=${activeTabId}, タイトル=${currentTab?.title}, 変更あり=${isChanged}`);
      
      // 内容が実際に変更された場合のみisUnsavedをtrueに設定
      return prev.map(tab => {
        if (tab.id === activeTabId) {
          const shouldMarkUnsaved = tab.content !== content;
          const updatedTab = { 
            ...tab, 
            content,
            isUnsaved: shouldMarkUnsaved ? true : tab.isUnsaved
          };
          
          if (shouldMarkUnsaved && !tab.isUnsaved) {
            console.log(`タブ "${tab.title}" を未保存状態に設定: isUnsaved=${tab.isUnsaved} → true`);
          }
          
          return updatedTab;
        }
        return tab;
      });
    });
  }, [activeTabId])

  // 選択されたコンテンツを置換する関数（実装例）
  const replaceSelectedEditorContent = useCallback((text: string) => {
    // 実装はエディタに依存する
    console.log('Replace selected content with:', text)
  }, [])

  // トリプルレイアウト（AIチャット）に切り替える
  const handleToggleTripleLayout = useCallback(() => {
    // エディタコンポーネントがまだロードされていない可能性があるため、
    // ステートを参照して更新
    if (editorRef.current) {
      const viewMode = editorRef.current.getViewMode();
      const newViewMode = viewMode === 'triple' ? 'split' : 'triple';
      editorRef.current.setViewMode(newViewMode);
    }
  }, []);

  // 復元するタブ数の設定を更新
  const handleRestoreTabsCountChange = useCallback((value: number[]) => {
    const newCount = value[0];
    console.log('復元するタブ数を変更します:', newCount);
    setSettings(prev => {
      const newSettings = {
        ...prev,
        restoreTabsCount: newCount
      };
      console.log('新しい設定:', newSettings);
      return newSettings;
    });
  }, [])

  // タブのタイトルを更新する関数
  const updateTabTitle = useCallback((tabId: string, newTitle: string) => {
    console.log('========= タブタイトル更新開始 =========');
    console.log('タブタイトルを更新します:', tabId, newTitle);
    
    // 更新前のタブ情報をログ出力
    const targetTab = tabs.find(tab => tab.id === tabId);
    console.log('更新前のタブ情報:', targetTab);
    
    if (!targetTab) {
      console.error('指定されたIDのタブが見つかりません:', tabId);
      console.log('========= タブタイトル更新失敗 =========');
      return;
    }
    
    setTabs(prev => {
      const updatedTabs = prev.map(tab => {
        if (tab.id === tabId) {
          // タイトル更新と同時に保存済み状態にする
          const updatedTab = { 
            ...tab, 
            title: newTitle, 
            isUnsaved: false  // 保存されたのでフラグをリセット
          };
          console.log(`タブ "${tab.title}" を更新: タイトル="${newTitle}", isUnsaved=${tab.isUnsaved} → false`);
          return updatedTab;
        }
        return tab;
      });
      
      // ローカルストレージにも保存
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTabs));
        console.log('更新されたタブ情報をローカルストレージに保存しました');
      } catch (err) {
        console.error('ローカルストレージへの保存に失敗しました:', err);
      }
      
      // 更新後のタブ情報をログ出力
      console.log('更新後のタブ一覧:', updatedTabs);
      console.log('========= タブタイトル更新完了 =========');
      return updatedTabs;
    });
  }, [tabs])

  // タブ切替ハンドラ - プレビュータイプも復元する
  const handleTabChange = useCallback((tabId: string) => {
    console.log('タブを切り替えます:', tabId);
    
    // 現在のタブが変更されていない場合は何もしない
    if (activeTabId === tabId) {
      console.log('既に選択されているタブなので何もしません:', tabId);
      return;
    }
    
    // 現在のアクティブタブと選択されたタブの情報を詳細に記録（デバッグ用）
    if (activeTabId) {
      const currentTab = tabs.find(tab => tab.id === activeTabId);
      const selectedTab = tabs.find(tab => tab.id === tabId);
      
      console.log(
        '切替前の状態 - 現在のタブ:',
        currentTab ? `ID=${currentTab.id}, タイトル=${currentTab.title}, プレビュータイプ=${currentTab.previewType}` : 'なし',
        '\n選択されたタブ:',
        selectedTab ? `ID=${selectedTab.id}, タイトル=${selectedTab.title}, プレビュータイプ=${selectedTab.previewType}` : 'なし'
      );
    }
    
    // エディタからの通知を無視するようフラグをセット
    // これにより他のタブのpreviewTypeが変更されるのを防ぐ
    setIgnoreNextPreviewUpdate(true);
    console.log('ignoreNextPreviewUpdateフラグをONに設定');
    
    // 選択されたタブのプレビュータイプを確認
    const selectedTab = tabs.find(tab => tab.id === tabId);
    
    if (!selectedTab) {
      console.error('選択されたタブが見つかりません:', tabId);
      return;
    }
    
    // プレビュータイプとビューモードを事前に決定
    const previewType = selectedTab.previewType || 'Markdown';
    let newViewMode: 'editor' | 'preview' | 'split' | 'triple' | 'marp-preview' | 'marp-split' | 'quarto-preview' | 'quarto-split' | 'markmap' | 'markmap-split';
    
    switch(previewType) {
      case 'Marp':
        newViewMode = 'marp-split';
        break;
      case 'Quarto':
        newViewMode = 'quarto-split'; 
        break;
      case 'Markmap':
        newViewMode = 'markmap-split';
        break;
      default:
        newViewMode = 'split';
    }
    
    // アクティブタブIDを変更
    setActiveTabId(tabId);
    console.log(`アクティブタブをID=${tabId}に設定、プレビュータイプ=${previewType}`);
    
    // プレビューモードを先に設定
    setPreviewMode(previewType);
    
    // 次の処理を非同期にして、タブ切替が完了するのを待つ
    setTimeout(() => {
      if (editorRef.current) {
        console.log(`タブID=${tabId}のプレビュータイプ${previewType}に基づいてビューモード${newViewMode}を設定`);
        
        // エディタのviewModeを設定
        editorRef.current.setViewMode(newViewMode);
        
        // 十分な時間後（エディタの状態変更が完了した後）にフラグをリセット
        setTimeout(() => {
          setIgnoreNextPreviewUpdate(false);
          console.log('ignoreNextPreviewUpdateフラグをOFFに設定');
        }, 800); // 十分な遅延を設定
      } else {
        console.warn('エディタへの参照が取得できません');
        setIgnoreNextPreviewUpdate(false);
      }
    }, 100);
    
    return () => {
      // 念のためタイムアウトをクリア
      setIgnoreNextPreviewUpdate(false);
      console.log('コンポーネントのアンマウント時にフラグをOFFに設定');
    };
  }, [tabs, activeTabId, editorRef, setPreviewMode]);

  // 音声入力状態変更のコールバック
  const handleVoiceInputStateChange = useCallback((
    listening: boolean,
    toggleFn: () => void
  ) => {
    setIsListening(listening);
    setToggleVoiceInput(() => toggleFn);
  }, []);

  // Vimモード状態変更のコールバック
  const handleVimModeStateChange = useCallback((
    vimMode: boolean,
    toggleFn: () => void
  ) => {
    setIsVimMode(vimMode);
    setToggleVimMode(() => toggleFn);
  }, []);

  // ファイルを新規タブで開く関数
  const handleOpenFileInNewTab = useCallback(async (filePath: string, fileName: string, content: string) => {
    console.log(`新規タブでファイル「${fileName}」を開きます`);
    
    // 新しいタブを作成
    const newTab: DocumentTab = {
      id: uuidv4(),
      title: fileName,
      content: content,
      isUnsaved: false,
      previewType: 'Markdown' // デフォルトのプレビュータイプ
    };
    
    // タブを追加
    setTabs(prev => [...prev, newTab]);
    
    // 新しいタブをアクティブにする
    setActiveTabId(newTab.id);
    
    console.log(`ファイル「${fileName}」を新規タブで開きました。タブID: ${newTab.id}`);
    return newTab.id;
  }, []);

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {!isInitialized ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p>アプリケーションを初期化中...</p>
          </div>
        </div>
      ) : (
        <>
          {/* エディタコンテンツ */}
          <div className="flex-1 overflow-hidden">
            <MarkdownEditor 
              key={activeTabId || 'default'}
              initialContent={getActiveTabContent()}
              onContentChange={handleContentUpdate}
              onEditorStateUpdate={handleEditorStateUpdate}
              ref={editorRef}
              isDarkMode={isDarkMode}
              onToggleDarkMode={toggleDarkMode}
              isFirstAccess={isFirstAccess}
              tabTitle={tabs.find(tab => tab.id === activeTabId)?.title}
              // AIチャット関連のpropsを追加
              chatMessages={chatHelpers.messages}
              chatInput={chatHelpers.input}
              chatHandleInputChange={chatHelpers.handleInputChange}
              chatIsLoading={chatHelpers.isLoading}
              chatSetMessages={chatHelpers.setMessages}
              chatSetInput={chatHelpers.setInput}
              chatAppend={chatHelpers.append}
              // ターミナル関連のpropsを追加
              terminalVisible={terminalVisible}
              onTerminalToggle={toggleTerminal}
              onTerminalInsertToEditor={handleReceiveInsertFunction}
              onFileSaved={(fileName: string) => {
                console.log('===== ファイル保存コールバック開始 =====');
                console.log('保存されたファイル名:', fileName);
                console.log('現在のアクティブタブID:', activeTabId);
                
                // デバッグ: タブ一覧をより詳細に表示
                console.log('現在のタブ情報:');
                tabs.forEach((tab, idx) => {
                  console.log(`タブ ${idx + 1}: id=${tab.id}, title=${tab.title}, isUnsaved=${tab.isUnsaved}, isActive=${tab.id === activeTabId}`);
                });
                
                if (activeTabId && fileName) {
                  // ファイル拡張子を取り除く
                  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
                  console.log('拡張子除去後のタブ名:', nameWithoutExtension);
                  
                  // 更新直前の確認
                  const activeTab = tabs.find(tab => tab.id === activeTabId);
                  console.log('更新対象のタブ:', activeTab);
                  
                  // タイトル更新実行
                  updateTabTitle(activeTabId, nameWithoutExtension);
                  
                  // 非同期で更新後のタブ状態も表示
                  setTimeout(() => {
                    console.log('タイトル更新後のタブ情報:');
                    const updatedTabs = tabs.map(tab => ({
                      id: tab.id,
                      title: tab.title,
                      isActive: tab.id === activeTabId
                    }));
                    console.log(updatedTabs);
                    console.log('===== ファイル保存コールバック終了 =====');
                  }, 100);
                } else {
                  console.warn('タブ名更新に必要な情報が不足しています - activeTabId:', activeTabId, 'fileName:', fileName);
                  console.log('===== ファイル保存コールバック終了 (エラー) =====');
                }
              }}
              onVoiceInputStateChange={handleVoiceInputStateChange}
              onVimModeStateChange={handleVimModeStateChange}
              tabs={tabs}
              activeTabId={activeTabId}
              onTabChange={handleTabChange}
              onTabClose={handleCloseTab}
              onTabAdd={handleAddTab}
              onUpdateTabTitle={updateTabTitle}
              onOpenFileInNewTab={handleOpenFileInNewTab}
            />
          </div>
          
          {/* ドキュメントタブ（ステータスバー） */}
          <DocumentTabs 
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
            onTabClose={handleCloseTab}
            onTabAdd={handleAddTab}
            cursorPosition={cursorPosition}
            editorMode={outputMode.charAt(0).toUpperCase() + outputMode.slice(1)}
            previewMode={previewMode}
            isVimMode={isVimMode}
            onToggleTripleLayout={handleToggleTripleLayout}
            isListening={isListening}
            onToggleVoiceInput={toggleVoiceInput}
            onToggleVimMode={toggleVimMode}
            isDarkMode={isDarkMode}
            onUpdateTabTitle={updateTabTitle}
          />
        </>
      )}
    </div>
  )
} 