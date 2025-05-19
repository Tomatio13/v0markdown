import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get('name');
    const folderPath = searchParams.get('path') || '/';
    
    if (!fileName) {
      return NextResponse.json({ error: 'ファイル名が指定されていません' }, { status: 400 });
    }
    
    // ROOT_DIRが環境変数に設定されていない場合はデフォルトパスを使用
    const rootDir = process.env.FILE_EXPLORER_ROOT_DIR || path.join(process.cwd(), 'tmp');
    
    // folderPathを正規化
    let normalizedFolderPath = folderPath;
    
    // 先頭の / を除去
    if (normalizedFolderPath.startsWith('/')) {
      normalizedFolderPath = normalizedFolderPath.substring(1);
    }
    
    // ファイル名からパスインジェクション攻撃を防ぐために正規化
    const safeFileName = fileName.replace(/\.\./g, '').replace(/[/\\]/g, '-');
    
    // ルートディレクトリと結合して完全なパスを作成
    const fullFolderPath = path.join(rootDir, normalizedFolderPath);
    
    // 指定されたフォルダパスが rootDir 内であることを確認
    const isPathValid = fullFolderPath.startsWith(rootDir);
    if (!isPathValid) {
      return NextResponse.json({ error: 'アクセス拒否：指定されたディレクトリ外へのアクセスはできません' }, { status: 403 });
    }
    
    // ファイルパスを作成
    const filePath = path.join(fullFolderPath, safeFileName);
    
    // ファイルの存在確認
    const exists = fs.existsSync(filePath);
    
    return NextResponse.json({ exists, fileName: safeFileName, path: normalizedFolderPath });
    
  } catch (error: any) {
    console.error('ファイル存在確認エラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 