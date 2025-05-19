"use client"

import React, { useEffect, useState } from 'react';
import { 
  Folder, 
  File, 
  FileText, 
  FileCode,
  FileJson,
  FileType,
  FileImage,
  RefreshCw,
  Home,
  ArrowUp,
  AlertCircle,
  Download
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from "@/components/ui/context-menu";

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: string;
}

interface FileExplorerProps {
  onFileSelect: (filePath: string, fileName: string) => void;
  isDarkMode?: boolean;
  className?: string;
}

// ファイルアイコンを取得する関数
const getFileIcon = (fileName: string, isDarkMode: boolean) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return <FileText className={`h-4 w-4 mr-2 ${isDarkMode ? 'text-gray-300' : 'text-blue-500'}`} />;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode className={`h-4 w-4 mr-2 ${isDarkMode ? 'text-gray-300' : 'text-yellow-500'}`} />;
    case 'json':
      return <FileJson className={`h-4 w-4 mr-2 ${isDarkMode ? 'text-gray-300' : 'text-green-500'}`} />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileType className={`h-4 w-4 mr-2 ${isDarkMode ? 'text-gray-300' : 'text-purple-500'}`} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return <FileImage className={`h-4 w-4 mr-2 ${isDarkMode ? 'text-gray-300' : 'text-pink-500'}`} />;
    default:
      return <File className="h-4 w-4 mr-2 text-gray-500" />;
  }
};

// ファイルサイズをフォーマットする関数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  onFileSelect, 
  isDarkMode = false,
  className
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [rootDirName, setRootDirName] = useState('root');
  const [rootDirFullPath, setRootDirFullPath] = useState('');
  // マークダウンファイルのみ表示するフラグをデフォルトでtrueに設定
  const [showOnlyMarkdownFiles, setShowOnlyMarkdownFiles] = useState(true);
  
  // ファイル一覧を取得する
  const loadFiles = async (dirPath = '/') => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/files/list?path=${encodeURIComponent(dirPath)}${showOnlyMarkdownFiles ? '&filterMarkdown=true' : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch files: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // ファイル一覧を更新
      setFiles(data.files || []);
      setCurrentPath(dirPath);
      
      // ルートディレクトリ名を設定（表示用）
      if (data.rootDir) {
        setRootDirName(data.rootDir);
      }
      
      // ルートディレクトリのフルパスを保存
      if (data.fullRootDir) {
        setRootDirFullPath(data.fullRootDir);
        // ローカルストレージにルートディレクトリのパスを保存
        localStorage.setItem('markdownEditorRootDir', data.fullRootDir);
      }
      
      // 現在のパスをローカルストレージに保存
      console.log('現在のフォルダパスを保存します:', dirPath);
      localStorage.setItem('markdownEditorCurrentPath', dirPath);
      
    } catch (error) {
      console.error('Error loading files:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };
  
  // 初回マウント時にファイル一覧を取得
  useEffect(() => {
    // ローカルストレージから最後に開いていたパスを取得
    const lastPath = localStorage.getItem('markdownEditorCurrentPath') || '/';
    loadFiles(lastPath);
  }, []);
  
  // Markdownフィルター設定変更時にファイル一覧を再読み込み
  useEffect(() => {
    if (currentPath) {
      loadFiles(currentPath);
    }
  }, [showOnlyMarkdownFiles, currentPath]);
  
  // 親ディレクトリに移動する
  const navigateToParent = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    setCurrentPath(parentPath || '/');
    loadFiles(parentPath || '/');
  };
  
  // ルートディレクトリに移動する
  const navigateToRoot = () => {
    setCurrentPath('/');
    loadFiles('/');
  };
  
  // ファイル一覧を再読み込みする
  const refreshFiles = () => {
    loadFiles(currentPath);
  };
  
  // ファイルがクリックされたときの処理
  const handleFileClick = async (file: FileItem) => {
    if (file.isDirectory) {
      // フォルダの場合は、そのフォルダに移動
      loadFiles(file.path);
    } else {
      try {
        // ファイルの場合は、そのファイルを選択
        // ファイルが存在するフォルダのパスを取得して保存
        const fileDir = file.path.substring(0, file.path.lastIndexOf('/'));
        const folderPath = fileDir || '/'; // パスが取得できない場合はルートディレクトリを使用
        
        console.log('ファイル選択時のフォルダパス保存:', {
          filePath: file.path,
          folderPath: folderPath
        });
        
        // ファイルのあるフォルダパスをローカルストレージに保存
        localStorage.setItem('markdownEditorCurrentPath', folderPath);
        
        onFileSelect(file.path, file.name);
      } catch (err: any) {
        console.error('ファイル選択エラー:', err);
        setError(err.message);
        alert(`ファイル選択エラー: ${err.message}`);
      }
    }
  };

  // ファイルをダウンロードする処理
  const handleFileDownload = async (file: FileItem) => {
    try {
      console.log(`ファイルダウンロード開始: ${file.path} (${file.name})`);
      const url = `/api/files/read?path=${encodeURIComponent(file.path)}`;
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
      const displayFileName = data.fileName || file.name;

      // Base64エンコードされたコンテンツをデコード
      if (data.contentBase64 && data.encoding === 'base64') {
        try {
          // Base64からデコード
          const binaryStr = atob(data.contentBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          
          // Blobを作成
          const blob = new Blob([bytes], { type: data.contentType || 'text/plain' });
          
          // ダウンロードリンクを作成
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = displayFileName;
          
          // リンクをクリックしてダウンロード
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          // URLオブジェクトを解放
          URL.revokeObjectURL(downloadLink.href);
          
          console.log(`ファイル「${displayFileName}」のダウンロード完了`);
        } catch (decodeError) {
          console.error('Base64デコードエラー:', decodeError);
          throw new Error('ファイルのデコードに失敗しました');
        }
      } else {
        throw new Error('ファイルの内容を取得できませんでした');
      }
    } catch (error) {
      console.error('ファイルダウンロードエラー詳細:', error);
      // エラーもアラートで表示
      alert(error instanceof Error ? `エラー: ${error.message}` : "ファイルをダウンロードできませんでした");
    }
  };

  // ファイル一覧をレンダリングする関数
  const renderFiles = () => {
    // 現在のパスのファイルをフィルタリング
    let filteredFiles = files.filter(file => {
      // パス処理を改善
      let fileDirPath;
      if (file.path.includes('/')) {
        fileDirPath = file.path.split('/').slice(0, -1).join('/') || '/';
      } else {
        fileDirPath = '/';
      }
      
      return fileDirPath === currentPath;
    });
    
    // マークダウンファイルのみ表示するフィルタリングを適用（ディレクトリは常に表示）
    if (showOnlyMarkdownFiles) {
      filteredFiles = filteredFiles.filter(file => 
        file.isDirectory || file.name.toLowerCase().endsWith('.md')
      );
    }
    
    if (filteredFiles.length === 0) {
      if (loading) {
        return <div className="pl-5 py-1 text-gray-500">ロード中...</div>;
      }
      if (error) {
        return <div className="pl-5 py-1 text-red-500">エラー: {error}</div>;
      }
      return <div className="pl-5 py-1 text-gray-500">このフォルダには表示可能なファイルがありません</div>;
    }
    
    return filteredFiles.map((file: FileItem) => {
      const depth = file.path.split('/').length;
      const paddingLeft = depth * 4; // パディングを調整（ツリー表示ではないため少なくする）
      
      // file.pathだけではなく、ファイルの完全なパスを生成して一意なkeyを作成
      const uniqueKey = `${file.path}-${file.name}-${file.isDirectory ? 'dir' : 'file'}`;
      
      return (
        <div key={uniqueKey}>
          {file.isDirectory ? (
            // ディレクトリの場合は右クリックメニューなし
            <div 
              className={cn(
                "flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group rounded-sm",
                "transition-colors duration-150 ease-in-out",
                file.isDirectory ? "font-medium" : ""
              )}
              style={{ paddingLeft: `${paddingLeft}px` }}
              onClick={() => handleFileClick(file)}
              onContextMenu={(e) => e.preventDefault()}
              title={file.name}
            >
              <Folder className={cn("h-4 w-4 mr-2", isDarkMode ? "text-gray-300" : "text-blue-500")} />
              
              <span className="truncate flex-1">{file.name}</span>
            </div>
          ) : (
            // ファイルの場合のみ右クリックメニューを追加
            <ContextMenu>
              <ContextMenuTrigger>
                <div 
                  className={cn(
                    "flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group rounded-sm",
                    "transition-colors duration-150 ease-in-out",
                    !file.isDirectory && file.name.toLowerCase().endsWith('.md') ? "bg-blue-100 dark:bg-[#1A1A1A] border-l-4 border-gray-500 dark:border-gray-700" : "",
                    file.isDirectory ? "font-medium" : ""
                  )}
                  style={{ paddingLeft: `${paddingLeft}px` }}
                  onClick={() => handleFileClick(file)}
                  onDoubleClick={() => handleFileClick(file)} 
                  title={`${file.name} (${formatFileSize(file.size)})`}
                >
                  {getFileIcon(file.name, isDarkMode)}
                  
                  <span className="truncate flex-1">{file.name}</span>
                  
                  <span className="text-gray-500 text-xs opacity-100 transition-opacity">
                    {new Date(file.modifiedTime).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).replace(/\//g, '/').replace(',', '')}
                  </span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => handleFileClick(file)}
                  className="cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  開く
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => handleFileDownload(file)}
                  className="cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  ダウンロード
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )}
        </div>
      );
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-50 dark:bg-[#171717] border-r border-gray-200 dark:border-gray-800", isDarkMode ? 'dark' : '', className)}>
      {/* ヘッダー部分 */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <Folder className={`h-5 w-5 mr-2 ${isDarkMode ? 'text-gray-300' : 'text-blue-500'}`} />
          <span className="text-sm font-medium truncate">
            Explorer
            {showOnlyMarkdownFiles && (
              <span className="ml-1 text-xs font-normal text-blue-500 dark:text-gray-400">
                （Markdown）
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={showOnlyMarkdownFiles ? "secondary" : "ghost"}
                  size="sm" 
                  onClick={() => setShowOnlyMarkdownFiles(!showOnlyMarkdownFiles)}
                  className={cn(
                    "h-7 w-7 p-0",
                    showOnlyMarkdownFiles 
                      ? "bg-blue-500 dark:bg-gray-600 text-white" 
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  <FileText className={cn(
                    "h-4 w-4", 
                    showOnlyMarkdownFiles 
                      ? "text-white" 
                      : "text-gray-500 dark:text-gray-400"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showOnlyMarkdownFiles 
                   ? "マークダウンファイルのみ表示中（クリックでオフ）" 
                   : "すべてのファイルを表示中（クリックでマークダウンのみに）"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => loadFiles(currentPath)}
                  className="h-7 w-7 p-0"
                >
                  <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>再読み込み</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* パスナビゲーション */}
      <div className="flex items-center gap-1 p-2 bg-gray-100 dark:bg-[#1E1E1E] overflow-x-auto text-xs">
        <button
          onClick={() => loadFiles('/')}
          className="flex items-center text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <Home className="h-3 w-3 mr-1" />
          {rootDirName}
        </button>
        
        {currentPath !== '/' && currentPath.split('/').filter(Boolean).map((segment, i, arr) => {
          const segmentPath = '/' + arr.slice(0, i + 1).join('/');
          return (
            <React.Fragment key={segmentPath}>
              <span className="text-gray-500 dark:text-gray-500">/</span>
              <button
                onClick={() => loadFiles(segmentPath)}
                className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 truncate max-w-[100px]"
              >
                {segment}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      
      {/* ファイル一覧 */}
      <ScrollArea className="flex-1">
        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">読み込み中...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-4 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <div className="p-2">
            {currentPath !== '/' && (
              <div 
                className="flex items-center py-1 px-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer"
                onClick={() => {
                  // 親ディレクトリのパスを取得
                  const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                  loadFiles(parentPath);
                }}
              >
                <ArrowUp className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span className="text-sm">上へ</span>
              </div>
            )}
            
            {renderFiles()}
          </div>
        )}
      </ScrollArea>
      
      {/* ステータスバー */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
        {loading ? (
          <span>読み込み中...</span>
        ) : (
          <span>
            {files.filter((f: FileItem) => {
              const fileDirPath = f.path.split('/').slice(0, -1).join('/');
              return fileDirPath === currentPath || (currentPath === '/' && f.path.indexOf('/') === -1);
            }).length} 項目
          </span>
        )}
      </div>
    </div>
  );
};

export default FileExplorer; 