import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'

// デバッグログフラグ（本番環境では false に設定）
const DEBUG = true

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const sessionId = uuidv4().substring(0, 8) // リクエスト追跡用の短いID
  
  // ログヘルパー関数
  const log = (message: string) => {
    if (DEBUG) {
      console.log(`[QUARTO-${sessionId}] ${message}`)
    }
  }

  log(`処理開始: ${new Date().toISOString()}`)
  
  try {
    // リクエストからマークダウンデータとフォーマット（pptxかhtml）を取得
    log('リクエストデータの解析中...')
    const formData = await request.formData()
    const markdownContent = formData.get('markdown')
    const format = (formData.get('format') as string) || 'pptx' // デフォルトはpptx
    
    if (!markdownContent || typeof markdownContent !== 'string') {
      log('エラー: マークダウンデータがありません')
      return NextResponse.json({ error: 'マークダウンデータが必要です' }, { status: 400 })
    }
    
    log(`マークダウン文字数: ${markdownContent.length}文字, フォーマット: ${format}`)
    
    // 一時ディレクトリの作成
    const tmpDir = path.join(os.tmpdir(), `quarto-${sessionId}`)
    log(`一時ディレクトリを作成: ${tmpDir}`)
    await fs.mkdir(tmpDir, { recursive: true })
    
    // 一時ファイルの作成 - 拡張子はqmdにする必要がある
    const qmdFilePath = path.join(tmpDir, 'document.qmd')
    log(`Quartoファイルを作成: ${qmdFilePath}`)
    await fs.writeFile(qmdFilePath, markdownContent)
    
    // 出力ファイルのパス
    const outputFilePath = path.join(tmpDir, `document.${format}`)
    log(`出力先ファイル: ${outputFilePath}`)
    
    // 環境変数取得
    const jupyterPath = process.env.JUPYTER_PATH || ''
    const quartoPath = process.env.QUARTO_PATH || '/opt/quarto/bin'
    
    if (!jupyterPath || !quartoPath) {
      log('環境変数エラー: JUPYTER_PATH または QUARTO_PATH が設定されていません')
      return NextResponse.json({ 
        error: 'サーバー設定エラー: 環境変数が正しく設定されていません' 
      }, { status: 500 })
    }
    
    // quartoコマンドの実行
    try {
      // タイムアウトを設定
      const TIMEOUT_MS = 60000; // 60秒
      log(`タイムアウト設定: ${TIMEOUT_MS}ms`);
      
      // プロジェクトルートディレクトリを取得
      const projectRoot = process.cwd();
      
      // シェルスクリプトファイルを作成
      const scriptPath = path.join(tmpDir, 'convert.sh');
      const scriptContent = `#!/bin/bash
cd "${projectRoot}"
echo "Quarto変換開始: $(date)"

# Jupyter環境をアクティベート
cd "${jupyterPath}"
source "venv/bin/activate"

# Quartoコマンド実行
if [ "${format}" = "html" ]; then
  "${quartoPath}/quarto" render "${qmdFilePath}" --to ${format} --embed-resources
else
  "${quartoPath}/quarto" render "${qmdFilePath}" --to ${format}
fi

EXIT_CODE=$?
echo "変換終了: $(date), 終了コード: $EXIT_CODE"

# 環境をデアクティベート
deactivate

if [ -f "${outputFilePath}" ] && [ -s "${outputFilePath}" ]; then
  echo "生成ファイル: $(du -h "${outputFilePath}" | cut -f1)"
  exit $EXIT_CODE
else
  echo "エラー: ファイル生成失敗"
  exit 1
fi
`;
      
      log(`シェルスクリプト作成: ${scriptPath}`);
      await fs.writeFile(scriptPath, scriptContent);
      await fs.chmod(scriptPath, 0o755); // 実行権限を付与
      
      log(`シェルスクリプト内容:\n${scriptContent}`);
      
      // シェルスクリプト実行
      log(`シェルスクリプト実行: ${scriptPath}`);
      
      await new Promise<void>((resolve, reject) => {
        log('スクリプト実行開始...');
        
        // タイムアウトタイマー
        const timeoutId = setTimeout(() => {
          log(`タイムアウト発生: ${TIMEOUT_MS}ms 経過`);
          reject(new Error(`スクリプト実行がタイムアウトしました: ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);
        
        // シェルスクリプトを実行
        const childProcess = spawn(scriptPath, [], {
          shell: true,
          cwd: projectRoot
        });
        
        // プロセスIDをログ出力
        if (childProcess.pid) {
          log(`プロセスID: ${childProcess.pid}`);
        }
        
        let stdoutData = '';
        let stderrData = '';
        
        // 標準出力
        childProcess.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString();
          stdoutData += chunk;
          log(`スクリプト stdout: ${chunk}`);
        });
        
        // 標準エラー出力
        childProcess.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString();
          stderrData += chunk;
          log(`スクリプト stderr: ${chunk}`);
        });
        
        // プロセス終了時の処理
        childProcess.on('close', (code: number | null) => {
          clearTimeout(timeoutId);
          log(`スクリプト終了 (コード: ${code})`);
          
          if (code === 0) {
            log(`スクリプト完了 (stdout: ${stdoutData.length}文字, stderr: ${stderrData.length}文字)`);
            resolve();
          } else {
            log(`スクリプトエラー - 出力: ${stdoutData}\nエラー: ${stderrData}`);
            reject(new Error(`変換スクリプト失敗 (コード: ${code})`));
          }
        });
        
        // エラー処理
        childProcess.on('error', (err: Error) => {
          clearTimeout(timeoutId);
          log(`スクリプト実行エラー: ${err.message}`);
          reject(err);
        });
      });
      
      // ファイルが存在するか確認
      try {
        const fileStats = await fs.stat(outputFilePath)
        log(`出力ファイル生成確認: ${fileStats.size} バイト`)
        
        if (fileStats.size === 0) {
          throw new Error('出力ファイルが空です')
        }
      } catch (statErr) {
        log(`出力ファイル確認エラー: ${statErr instanceof Error ? statErr.message : String(statErr)}`)
        throw new Error('出力ファイルが生成されませんでした')
      }
      
      // 出力ファイルの読み込み
      log('出力ファイルの読み込み開始')
      const outputData = await fs.readFile(outputFilePath)
      log(`出力ファイル読み込み完了: ${outputData.length} バイト`)
      
      // クリーンアップ - 一時ファイルの削除
      log('一時ファイルの削除を開始')
      fs.rm(tmpDir, { recursive: true, force: true })
        .then(() => log('一時ファイル削除完了'))
        .catch(err => log(`一時ファイル削除エラー: ${err.message}`))
      
      // ファイルを返す
      const elapsedTime = Date.now() - startTime
      log(`処理完了: ${elapsedTime}ms`)
      
      // Content-Typeの設定
      let contentType = 'application/octet-stream'
      let fileName = 'document'
      
      if (format === 'pptx') {
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        fileName = 'document.pptx'
      } else if (format === 'html') {
        contentType = 'text/html'
        fileName = 'document.html'
      }
      
      return new NextResponse(outputData, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8\'\'${fileName}`,
          'X-Processing-Time': `${elapsedTime}ms`
        }
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log(`Quarto実行エラー: ${errorMessage}`)
      
      // クリーンアップを試みる
      log('エラー後のクリーンアップを試行')
      fs.rm(tmpDir, { recursive: true, force: true })
        .then(() => log('エラー後のクリーンアップ完了'))
        .catch(err => log(`エラー後のクリーンアップ失敗: ${err.message}`))
      
      return NextResponse.json(
        { error: `Quartoの実行中にエラーが発生しました: ${errorMessage}` }, 
        { status: 500 }
      )
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log(`全体処理エラー: ${errorMessage}`)
    
    return NextResponse.json(
      { error: `Quarto変換中にエラーが発生しました: ${errorMessage}` }, 
      { status: 500 }
    )
  }
} 