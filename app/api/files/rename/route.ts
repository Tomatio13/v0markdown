import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 環境変数から基本ディレクトリを取得（設定がなければtmpフォルダを使用）
const rootDir = process.env.FILE_EXPLORER_ROOT_DIR || './tmp';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディからパラメータを取得
    const body = await request.json();
    const { oldPath, newName, isDirectory } = body;

    // パラメータの検証
    if (!oldPath || !newName) {
      return NextResponse.json(
        { error: '元のパスと新しい名前は必須です' },
        { status: 400 }
      );
    }

    // 不正なパス入力の防止（ディレクトリトラバーサル対策）
    if (oldPath.includes('..') || newName.includes('..') || newName.includes('/') || newName.includes('\\')) {
      return NextResponse.json(
        { error: '不正なパス名または不正な文字が含まれています' },
        { status: 400 }
      );
    }

    // 絶対パスを作成
    const absoluteOldPath = path.resolve(rootDir, oldPath.startsWith('/') ? oldPath.substring(1) : oldPath);
    
    // 親ディレクトリと新しいファイルパスを取得
    const parentDir = path.dirname(absoluteOldPath);
    const newPath = path.join(parentDir, newName);
    
    // 元のパスが存在するか確認
    if (!fs.existsSync(absoluteOldPath)) {
      return NextResponse.json(
        { error: '指定されたパスが存在しません' },
        { status: 404 }
      );
    }
    
    // 新しいパスが既に存在する場合はエラー
    if (fs.existsSync(newPath)) {
      return NextResponse.json(
        { error: '新しい名前のファイルまたはフォルダが既に存在します' },
        { status: 409 }
      );
    }
    
    // リネーム処理
    fs.renameSync(absoluteOldPath, newPath);
    
    // 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      oldPath,
      newPath: path.relative(rootDir, newPath).replace(/\\/g, '/') // 相対パスに変換（Windows対応）
    });
    
  } catch (error) {
    console.error('ファイル/フォルダリネームエラー:', error);
    return NextResponse.json(
      { error: `リネーム処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 