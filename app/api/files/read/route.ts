import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'ファイルパスが指定されていません' }, { status: 400 });
    }
    
    // ROOT_DIRが環境変数に設定されていない場合はデフォルトパスを使用
    const rootDir = process.env.FILE_EXPLORER_ROOT_DIR || process.cwd();
    
    // パスを安全に解決（ディレクトリトラバーサル攻撃の防止）
    let normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const resolvedPath = path.join(rootDir, normalizedPath);
    
    // 指定されたルートディレクトリ外へのアクセスを防止
    if (!resolvedPath.startsWith(rootDir)) {
      return NextResponse.json({ error: 'アクセス拒否：指定されたディレクトリ外へのアクセスはできません' }, { status: 403 });
    }
    
    // ファイルの存在確認
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'ファイルが存在しません' }, { status: 404 });
    }
    
    // ファイルかどうかの確認
    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: '指定されたパスはファイルではありません' }, { status: 400 });
    }
    
    // ファイルの拡張子を取得
    const ext = path.extname(resolvedPath).toLowerCase();
    
    // 許可されたファイル拡張子のリスト（セキュリティ対策）
    const allowedExtensions = ['.md', '.txt', '.json', '.yml', '.yaml', '.js', '.ts', '.jsx', '.tsx', '.css', '.html'];
    
    // 拡張子の確認
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'このタイプのファイルは読み込めません' }, { status: 403 });
    }
    
    // ファイルの内容を読み取る - バイナリとして読み込み、Base64エンコードする
    const contentBuffer = fs.readFileSync(resolvedPath);
    const contentBase64 = contentBuffer.toString('base64');
    
    // ファイル名を取得
    const fileName = path.basename(resolvedPath);
    
    // Content-Typeの設定
    const contentType = ext === '.md' ? 'text/markdown' : 'text/plain';
    
    // カスタムヘッダーを使わずに、JSON本文だけで情報を返す（ヘッダー問題を回避）
    return NextResponse.json({
      contentBase64: contentBase64,
      encoding: 'base64',
      fileName: fileName,
      filePath: normalizedPath,
      contentType: contentType
    });
  } catch (error: any) {
    console.error('ファイル読み込みエラー:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 