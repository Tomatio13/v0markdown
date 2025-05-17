import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolve } from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get('path') || '/';
    const filterMarkdown = searchParams.get('filterMarkdown') === 'true';
    
    // ROOT_DIRが環境変数に設定されていない場合はデフォルトパスを使用
    // 例えば /home/user/documents や現在のプロジェクトルートなど
    const rootDir = process.env.FILE_EXPLORER_ROOT_DIR || process.cwd();
    // console.log('環境変数から読み取ったルートディレクトリ:', rootDir);
    // console.log('リクエストされたパス:', dirPath);
    // console.log('Markdownフィルター:', filterMarkdown);
    
    // パスを安全に解決（ディレクトリトラバーサル攻撃の防止）
    let normalizedPath = path.normalize(dirPath).replace(/^\.\.(\/|\\|$)+/, '');
    const resolvedPath = path.join(rootDir, normalizedPath);
    // console.log('解決されたパス:', resolvedPath);
    
    // 指定されたルートディレクトリ外へのアクセスを防止
    if (!resolvedPath.startsWith(rootDir)) {
      return NextResponse.json({ error: 'アクセス拒否：指定されたディレクトリ外へのアクセスはできません' }, { status: 403 });
    }
    
    // ディレクトリが存在するか確認
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: `ディレクトリが存在しません: ${normalizedPath}` }, { status: 404 });
    }
    
    // ファイル情報を取得
    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: `指定されたパスはディレクトリではありません: ${normalizedPath}` }, { status: 400 });
    }
    
    // ディレクトリ内のファイル/フォルダ一覧を取得
    const items = fs.readdirSync(resolvedPath, { withFileTypes: true });
    
    // ファイル情報を加工
    let files = items.map(item => {
      const itemPath = path.join(normalizedPath, item.name);
      const fullPath = path.join(resolvedPath, item.name);
      const stats = fs.statSync(fullPath);
      
      return {
        name: item.name,
        path: itemPath,
        isDirectory: item.isDirectory(),
        size: stats.size,
        modifiedTime: stats.mtime.toISOString()
      };
    });
    
    // マークダウンファイルのみにフィルタリング（filterMarkdown=trueの場合）
    if (filterMarkdown) {
      files = files.filter(file => 
        file.isDirectory || file.name.toLowerCase().endsWith('.md')
      );
    }
    
    // console.log(`取得されたファイル数: ${files.length}`);
    
    // 結果をより詳細に返す
    // console.log('正常に取得が完了しました。ファイルの一部:', files.slice(0, 5).map(f => ({
    //   name: f.name,
    //   path: f.path,
    //   isDirectory: f.isDirectory
    // })));
    
    return NextResponse.json({
      files,
      currentPath: normalizedPath,
      rootDir: path.basename(rootDir),
      fullRootDir: rootDir // フルパスも送信
    });
  } catch (error) {
    console.error('ファイル一覧取得エラー:', error);
    return NextResponse.json({ error: `ファイル一覧の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }
} 