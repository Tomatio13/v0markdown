import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 利用可能なMarpテーマを取得するAPI
 * /public/marp_themesディレクトリからCSSファイルの一覧を取得し、
 * 拡張子を除いたファイル名のリストを返す
 */
export async function GET() {
  try {
    // public/marp_themesディレクトリのパスを取得
    const themesDir = path.join(process.cwd(), 'public', 'marp_themes');
    
    // ディレクトリが存在するか確認
    if (!fs.existsSync(themesDir)) {
      return NextResponse.json({ 
        error: 'テーマディレクトリが見つかりません' 
      }, { status: 404 });
    }
    
    // ディレクトリ内のファイル一覧を取得
    const files = fs.readdirSync(themesDir);
    
    // .cssファイルのみをフィルタリングし、拡張子を除いたファイル名を取得
    const themeNames = files
      .filter(file => file.endsWith('.css'))
      .map(file => file.replace('.css', ''));
    
    // defaultテーマを最初に追加
    if (!themeNames.includes('default')) {
      themeNames.unshift('default');
    }
    
    return NextResponse.json({ themes: themeNames });
  } catch (error) {
    console.error('Marpテーマ取得エラー:', error);
    return NextResponse.json({ 
      error: 'テーマリスト取得中にエラーが発生しました' 
    }, { status: 500 });
  }
} 