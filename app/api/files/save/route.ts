import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  console.log('=== ファイル保存APIが呼び出されました ===');
  try {
    // 環境変数からアップロード機能の有効無効を確認
    const fileUploadEnabled = process.env.NEXT_PUBLIC_FILE_UPLOAD !== 'OFF';
    if (!fileUploadEnabled) {
      console.error('ファイルアップロード機能が無効です');
      return NextResponse.json({ error: 'ファイルアップロード機能は無効に設定されています' }, { status: 403 });
    }

    // リクエストボディを取得
    const body = await request.json();
    const { fileName, content, folderPath, overwrite = false, checkOnly = false } = body;
    
    console.log('リクエスト情報:', {
      fileName,
      contentLength: content?.length || 0,
      folderPath,
      folderPathType: typeof folderPath,
      overwrite,
      checkOnly
    });

    if (!fileName || typeof fileName !== 'string') {
      console.error('ファイル名が不正です:', fileName);
      return NextResponse.json({ error: 'ファイル名が指定されていないか不正です' }, { status: 400 });
    }

    if (content === undefined || content === null && !checkOnly) {
      console.error('コンテンツが指定されていません');
      return NextResponse.json({ error: 'コンテンツが指定されていません' }, { status: 400 });
    }

    // ROOT_DIRが環境変数に設定されていない場合はデフォルトパスを使用
    const rootDir = process.env.FILE_EXPLORER_ROOT_DIR || path.join(process.cwd(), 'tmp');
    console.log('ルートディレクトリ:', rootDir);
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(rootDir)) {
      console.log('ルートディレクトリが存在しないため作成します:', rootDir);
      fs.mkdirSync(rootDir, { recursive: true });
    }

    // ファイル名からパスインジェクション攻撃を防ぐために正規化
    const safeFileName = fileName.replace(/\.\./g, '').replace(/[/\\]/g, '-');
    
    // 保存先のパスを決定（folderPathが指定されている場合はそれを使用）
    let targetPath;
    if (folderPath && typeof folderPath === 'string') {
      // folderPathを正規化
      let normalizedFolderPath = folderPath;
      
      // 先頭の / を除去
      if (normalizedFolderPath.startsWith('/')) {
        normalizedFolderPath = normalizedFolderPath.substring(1);
      }
      
      console.log('正規化されたフォルダパス:', normalizedFolderPath);
      
      // ルートディレクトリと結合して完全なパスを作成
      const fullFolderPath = path.join(rootDir, normalizedFolderPath);
      
      // 指定されたフォルダパスが rootDir 内であることを確認
      const isPathValid = fullFolderPath.startsWith(rootDir);
      console.log('パス検証結果:', {
        rootDir,
        normalizedFolderPath,
        fullFolderPath,
        isPathValid
      });
      
      if (!isPathValid) {
        console.error('アクセス拒否: 指定されたパスがルートディレクトリ外です');
        return NextResponse.json({ error: 'アクセス拒否：指定されたディレクトリ外へのアクセスはできません' }, { status: 403 });
      }
      
      // フォルダが存在しない場合は作成
      if (!fs.existsSync(fullFolderPath)) {
        console.log('フォルダが存在しないため作成します:', fullFolderPath);
        fs.mkdirSync(fullFolderPath, { recursive: true });
      }
      
      targetPath = path.join(fullFolderPath, safeFileName);
    } else {
      targetPath = path.join(rootDir, safeFileName);
    }

    console.log('ファイル保存先パス:', targetPath);
    
    // ファイルの存在確認
    const fileExists = fs.existsSync(targetPath);
    
    // ファイル存在確認モードの場合はここで結果を返す
    if (checkOnly) {
      console.log(`ファイル存在確認結果: ${fileExists ? '存在する' : '存在しない'} (${targetPath})`);
      return NextResponse.json({
        exists: fileExists,
        fileName: safeFileName,
        path: targetPath.replace(process.cwd(), '')
      });
    }
    
    // 上書き確認 - ファイルが存在し、かつ明示的な上書き許可がない場合
    if (fileExists && !overwrite) {
      console.log('上書き確認が必要なため保存を中止します:', targetPath);
      return NextResponse.json({
        requiresConfirmation: true,
        exists: true,
        fileName: safeFileName,
        path: targetPath.replace(process.cwd(), '')
      }, { status: 409 }); // 409 Conflict
    }

    // ファイルを書き込み
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('ファイルを保存しました');

    return NextResponse.json({ 
      success: true, 
      filePath: targetPath.replace(process.cwd(), ''),
      fileName: safeFileName,
      fullPath: targetPath
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