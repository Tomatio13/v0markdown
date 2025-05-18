import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // 環境変数からアップロード機能の有効無効を確認
    const fileUploadEnabled = process.env.NEXT_PUBLIC_FILE_UPLOAD !== 'OFF';
    if (!fileUploadEnabled) {
      return NextResponse.json({ error: 'ファイルアップロード機能は無効に設定されています' }, { status: 403 });
    }

    // リクエストボディを取得
    const body = await request.json();
    const { fileName, content } = body;

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'ファイル名が指定されていないか不正です' }, { status: 400 });
    }

    if (content === undefined || content === null) {
      return NextResponse.json({ error: 'コンテンツが指定されていません' }, { status: 400 });
    }

    // ROOT_DIRが環境変数に設定されていない場合はデフォルトパスを使用
    const rootDir = process.env.FILE_EXPLORER_ROOT_DIR || path.join(process.cwd(), 'tmp');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    // ファイル名からパスインジェクション攻撃を防ぐために正規化
    const safeFileName = fileName.replace(/\.\./g, '').replace(/[/\\]/g, '-');
    const filePath = path.join(rootDir, safeFileName);

    // ファイルを書き込み
    fs.writeFileSync(filePath, content, 'utf8');

    return NextResponse.json({ 
      success: true, 
      filePath: filePath.replace(process.cwd(), ''),
      fileName: safeFileName
    });
    
  } catch (error) {
    console.error('ファイル保存中にエラーが発生しました:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'ファイル保存中に不明なエラーが発生しました' 
    }, { 
      status: 500 
    });
  }
} 