import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * 利用可能なMarpテーマを取得するAPI
 * /public/marp_themesディレクトリからCSSファイルの一覧を取得し、
 * 拡張子を除いたファイル名のリストを返す
 */
export async function GET() {
  // すべてのパス解決試行をログに記録
  let allPaths = [];
  let successPath = null;

  try {
    // 異なるパターンでパスを試行
    const possiblePaths = [
      path.resolve(process.cwd(), 'public', 'marp_themes'),
      path.join(process.cwd(), 'public', 'marp_themes'),
      path.resolve('./public/marp_themes'),
      path.join('./public', 'marp_themes'),
      // Next.jsの開発サーバーでは異なるパスになる場合がある
      path.resolve('public', 'marp_themes'),
      // 絶対パスでも試す
      // '/home/masato/Docker/markdown/public/marp_themes'
    ];

    // console.log('プロセスの作業ディレクトリ:', process.cwd());
    
    // 各パスを試行
    for (const themesDir of possiblePaths) {
      try {
        allPaths.push({ path: themesDir, exists: existsSync(themesDir) });
        
        if (existsSync(themesDir)) {
          // ディレクトリであることを確認
          const stats = await stat(themesDir);
          if (stats.isDirectory()) {
            // console.log(`有効なディレクトリを発見: ${themesDir}`);
            successPath = themesDir;
            
            // ファイル一覧を取得
            const files = await readdir(themesDir);
            // console.log(`テーマファイル一覧 (${themesDir}):`, files);
            
            // .cssファイルのみをフィルタリングし、拡張子を除いたファイル名を取得
            const themeNames = files
              .filter(file => file.endsWith('.css'))
              .map(file => file.replace('.css', ''));
            
            // defaultテーマを最初に追加（存在しない場合のみ）
            if (!themeNames.includes('default')) {
              themeNames.unshift('default');
            }
            
            // console.log('送信するテーマ一覧:', themeNames);
            return NextResponse.json({ themes: themeNames });
          } else {
            console.log(`パスは存在しますが、ディレクトリではありません: ${themesDir}`);
          }
        }
      } catch (err) {
        console.error(`パス ${themesDir} の確認中にエラー:`, err);
      }
    }
    
    // すべてのパスが失敗した場合、デフォルトのみを返す
    // console.warn('有効なテーマディレクトリが見つかりませんでした。デフォルトテーマのみを使用します。');
    // console.warn('チェックされたパス:', JSON.stringify(allPaths, null, 2));
    
    return NextResponse.json({ 
      themes: ['default'],
      warning: 'テーマディレクトリが見つからないため、デフォルトテーマのみを使用しています',
      pathsChecked: allPaths
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Marpテーマ取得中に例外が発生しました:');
    console.error(`エラーメッセージ: ${errorMessage}`);
    console.error(`スタックトレース: ${errorStack}`);
    console.error('チェックされたパス:', JSON.stringify(allPaths, null, 2));
    
    // エラー時はデフォルトテーマだけ返す
    return NextResponse.json({ 
      themes: ['default'],
      error: `テーマリスト取得中にエラーが発生しました: ${errorMessage}`,
      pathsChecked: allPaths
    });
  }
} 