"use client"

import React, { useEffect, useState } from 'react';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  FileCode,
  FileJson,
  FileType,
  FileImage,
  RefreshCw,
  Home,
  ArrowUp,
  AlertCircle
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));
  const [rootDirName, setRootDirName] = useState('root');
  // マークダウンファイルのみ表示するフラグをデフォルトでtrueに設定
  const [showOnlyMarkdownFiles, setShowOnlyMarkdownFiles] = useState(true);
  
  // フォルダの展開状態を切り替える
  const toggleFolder = (folderPath: string) => {
    const newExpandedFolders = new Set(expandedFolders);
    
    if (newExpandedFolders.has(folderPath)) {
      newExpandedFolders.delete(folderPath);
    } else {
      newExpandedFolders.add(folderPath);
      // フォルダを展開時に、そのフォルダ内のファイル一覧を取得
      loadFiles(folderPath);
    }
    
    setExpandedFolders(newExpandedFolders);
  };
  
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
    } catch (error) {
      console.error('Error loading files:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };
  
  // 初回マウント時にファイル一覧を取得
  useEffect(() => {
    loadFiles('/');
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
      toggleFolder(file.path);
    } else {
      try {
        onFileSelect(file.path, file.name);
      } catch (err: any) {
        console.error('ファイル選択エラー:', err);
        setError(err.message);
        alert(`ファイル選択エラー: ${err.message}`);
      }
    }
  };

  // フォルダツリーをレンダリングする再帰的な関数
  const renderFileTree = (parentPath = '/') => {
    // 親パスに基づいてファイルをフィルタリング
    let filteredFiles = files.filter(file => {
      // パス処理を改善
      let fileDirPath;
      if (file.path.includes('/')) {
        fileDirPath = file.path.split('/').slice(0, -1).join('/') || '/';
      } else {
        fileDirPath = '/';
      }
      
      return fileDirPath === parentPath;
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
      return <div className="pl-5 py-1 text-gray-500">(空)</div>;
    }
    
    return filteredFiles.map((file: FileItem) => {
      const isExpanded = expandedFolders.has(file.path);
      const depth = file.path.split('/').length;
      const paddingLeft = depth * 12;
      
      // file.pathだけではなく、ファイルの完全なパスを生成して一意なkeyを作成
      const uniqueKey = `${file.path}-${file.name}-${file.isDirectory ? 'dir' : 'file'}`;
      
      return (
        <div key={uniqueKey}>
          <div 
            className={cn(
              "flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group rounded-sm",
              "transition-colors duration-150 ease-in-out",
              !file.isDirectory && file.name.toLowerCase().endsWith('.md') ? "bg-blue-100 dark:bg-[#1A1A1A] border-l-4 border-gray-500 dark:border-gray-700" : ""
            )}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => handleFileClick(file)}
            onDoubleClick={() => file.isDirectory ? loadFiles(file.path) : handleFileClick(file)} 
            title={`${file.name}${file.isDirectory ? '' : ` (${formatFileSize(file.size)})`}`}
          >
            {file.isDirectory ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                )}
                <Folder className={cn("h-4 w-4 mr-2", isExpanded ? (isDarkMode ? "text-gray-300" : "text-yellow-500") : "text-gray-500 dark:text-gray-400")} />
              </>
            ) : (
              <div className="w-5 ml-4 mr-1"></div> // アイコンの位置揃え用の空div
            )}
            
            {!file.isDirectory && getFileIcon(file.name, isDarkMode)}
            
            <span className="truncate flex-1">{file.name}</span>
            
            {!file.isDirectory && (
              <span className="text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                {formatFileSize(file.size)}
              </span>
            )}
          </div>
          
          {file.isDirectory && isExpanded && (
            <div className="ml-4">
              {renderFileTree(file.path)}
            </div>
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
            
            {renderFileTree(currentPath)}
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