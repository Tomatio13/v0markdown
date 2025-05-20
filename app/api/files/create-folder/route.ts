import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 環境変数から基本ディレクトリを取得（設定がなければtmpフォルダを使用）
const rootDir = process.env.FILE_EXPLORER_ROOT_DIR || './tmp';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディからパラメータを取得
    const body = await request.json();
    const { path: folderPath, folderName } = body;

    // パラメータの検証
    if (!folderPath || !folderName) {
      return NextResponse.json(
        { error: 'パスとフォルダ名は必須です' },
        { status: 400 }
      );
    }

    // 不正なパス入力の防止（ディレクトリトラバーサル対策）
    if (folderPath.includes('..') || folderName.includes('..') || folderName.includes('/') || folderName.includes('\\')) {
      return NextResponse.json(
        { error: '不正なパス名または不正な文字が含まれています' },
        { status: 400 }
      );
    }

    // 絶対パスを作成（ルートディレクトリからの相対パス）
    const baseDir = path.resolve(rootDir, folderPath.startsWith('/') ? folderPath.substring(1) : folderPath);
    const newFolderPath = path.join(baseDir, folderName);
    
    // 親ディレクトリが存在するか確認
    if (!fs.existsSync(baseDir)) {
      return NextResponse.json(
        { error: '指定された親ディレクトリが存在しません' },
        { status: 404 }
      );
    }
    
    // 作成しようとしているフォルダが既に存在する場合はエラー
    if (fs.existsSync(newFolderPath)) {
      return NextResponse.json(
        { error: '同名のフォルダまたはファイルが既に存在します' },
        { status: 409 }
      );
    }
    
    // フォルダ作成
    fs.mkdirSync(newFolderPath, { recursive: true });
    
    // 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      path: path.relative(rootDir, newFolderPath).replace(/\\/g, '/') // 相対パスに変換（Windows対応）
    });
    
  } catch (error) {
    console.error('フォルダ作成エラー:', error);
    return NextResponse.json(
      { error: `フォルダ作成中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 