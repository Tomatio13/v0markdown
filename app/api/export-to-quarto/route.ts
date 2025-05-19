import { NextRequest, NextResponse } from 'next/server'
import { spawn, exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import util from 'util'

// execをPromise化
const execPromise = util.promisify(exec)

// デバッグログフラグ（本番環境では false に設定）
const DEBUG = false

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const sessionId = uuidv4().substring(0, 8) // リクエスト追跡用の短いID
  const tmpDir = path.join(os.tmpdir(), `quarto-${sessionId}`)
  
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
    let markdownContent = formData.get('markdown')
    const format = (formData.get('format') as string) || 'pptx' // デフォルトはpptx
    
    if (!markdownContent || typeof markdownContent !== 'string') {
      log('エラー: マークダウンデータがありません')
      return NextResponse.json({ error: 'マークダウンデータが必要です' }, { status: 400 })
    }
    
    log(`マークダウン文字数: ${markdownContent.length}文字, フォーマット: ${format}`)
    
    // 一時ディレクトリの作成
    log(`一時ディレクトリを作成: ${tmpDir}`)
    await fs.mkdir(tmpDir, { recursive: true })
    
    // --- Puppeteer設定ファイル作成 ---
    const puppeteerConfigPath = path.join(tmpDir, 'puppeteer-config.json')
    const puppeteerConfigContent = JSON.stringify({ args: ['--no-sandbox'] })
    try {
      log(`Puppeteer設定ファイル作成: ${puppeteerConfigPath}`)
      await fs.writeFile(puppeteerConfigPath, puppeteerConfigContent)
    } catch (writeErr) {
      log(`エラー: Puppeteer設定ファイルの書き込みに失敗: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`)
      throw new Error('Puppeteer設定ファイルの作成に失敗しました')
    }
    // --- Puppeteer設定ファイル作成 終了 ---

    // --- Mermaid処理 ---
    log('Mermaidコードブロックの検索と変換開始...')
    const mermaidRegex = /```mermaid\s*([\s\S]*?)```/g
    const mermaidBlocks = []
    let match
    while ((match = mermaidRegex.exec(markdownContent)) !== null) {
      mermaidBlocks.push({ fullMatch: match[0], code: match[1].trim() })
    }

    if (mermaidBlocks.length > 0) {
      log(`${mermaidBlocks.length}個のMermaidブロックを検出`)
      const projectRoot = process.cwd()
      const mmdcPath = path.join(projectRoot, 'node_modules', '.bin', 'mmdc')

      try {
        await fs.access(mmdcPath)
        log(`mmdcパス確認: ${mmdcPath}`)
      } catch (err) {
        log(`エラー: mmdcが見つかりません (${mmdcPath})。 mermaid-cliのインストールを確認してください。`)
        return NextResponse.json({
          error: `Mermaid処理に必要なツール (mmdc) が見つかりません。サーバー管理者に連絡してください。`,
        }, { status: 500 })
      }

      for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i]
        const mmdInputPath = path.join(tmpDir, `mermaid-input-${i}.mmd`)
        // SVG -> PNG に変更
        const pngOutputPath = path.join(tmpDir, `mermaid-output-${i}.png`)
        const pngRelativePath = `./mermaid-output-${i}.png` // パスも変更

        log(`[Mermaid ${i}] 一時入力ファイル作成: ${mmdInputPath}`)
        await fs.writeFile(mmdInputPath, block.code)

        // mmdcコマンド実行 (puppeteer設定ファイル -p を追加、出力ファイルを .png に変更)
        // 背景は透明のままにしますが、PPTXで問題が続く場合は -b white など試す価値あり
        const mmdcCommand = `"${mmdcPath}" -i "${path.basename(mmdInputPath)}" -o "${path.basename(pngOutputPath)}" -p "${path.basename(puppeteerConfigPath)}" -b transparent`
        log(`[Mermaid ${i}] mmdc実行 (PNG) (in ${tmpDir}): ${mmdcCommand}`) // ログ変更 (PNG)
        try {
          // mmdcコマンドをtmpDirで実行
          const { stdout, stderr } = await execPromise(mmdcCommand, { cwd: tmpDir })
          if (stderr) {
            // mmdcは警告をstderrに出力することがあるため、エラーとは限らない
            log(`[Mermaid ${i}] mmdc stderr: ${stderr}`)
          }
          log(`[Mermaid ${i}] mmdc stdout: ${stdout}`)
          // PNGファイルが存在するか確認
          await fs.access(pngOutputPath);
          log(`[Mermaid ${i}] PNG生成成功: ${pngOutputPath}`) // ログ変更

          // Markdown内のコードブロックを ![](...) 形式の画像リンクに置換 (.png を参照)
          // 前後に改行を追加して、他の要素との間隔を確保する
          const imgTag = `\n\n![](${pngRelativePath})\n\n` // 参照先変更
          markdownContent = markdownContent.replace(block.fullMatch, imgTag)

        } catch (error) {
          log(`[Mermaid ${i}] mmdc実行エラー (PNG): ${error instanceof Error ? error.message : String(error)}`) // ログ変更 (PNG)
          // エラーメッセージをコードブロックとして挿入（デバッグ用）
          const errorBlock = `\n\`\`\`\nError rendering Mermaid diagram ${i} to PNG: ${error instanceof Error ? error.message : String(error)}\n\`\`\`\n` // ログ変更
          markdownContent = markdownContent.replace(block.fullMatch, `\n\n${errorBlock}\n\n`)
          // エラー時も処理を続行する
        }
      }
      log('MermaidコードブロックのPNGへの置換完了') // ログ変更
    } else {
      log('Mermaidブロックは見つかりませんでした')
    }
    // --- Mermaid処理 終了 ---

    // デバッグ用: 処理後のMarkdown内容を出力
    if (DEBUG) {
      log(`処理済みマークダウン内容:\n----\n${markdownContent}\n----`)
    }

    // 一時ファイルの作成 - 拡張子はqmdにする必要がある
    const qmdFilePath = path.join(tmpDir, 'document.qmd')
    log(`Quartoファイルを作成: ${qmdFilePath}`)
    // Mermaid処理後のmarkdownContentを書き込む
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
      const TIMEOUT_MS = 120000; // 120秒
      log(`タイムアウト設定: ${TIMEOUT_MS}ms`)
      
      // シェルスクリプトファイルを作成
      const scriptPath = path.join(tmpDir, 'convert.sh')
      const scriptContent = `#!/bin/bash

echo "Quarto変換開始: $(date)"

# Jupyter環境をアクティベート
cd "${jupyterPath}"
source "venv/bin/activate"
# 一時ディレクトリに移動してQuartoを実行 (SVGの相対パス解決のため)
cd "${tmpDir}"


# Quartoコマンド実行 (入力と出力ファイルをbasenameに変更)
# HTMLの場合は --embed-resources を維持
if [ "${format}" = "html" ]; then
  "${quartoPath}/quarto" render "${path.basename(qmdFilePath)}" --to ${format} --embed-resources
elif [ "${format}" = "pdf" ]; then
  # PDFの場合、追加の設定が必要な場合がある (LaTeXなど)
  "${quartoPath}/quarto" render "${path.basename(qmdFilePath)}" --to ${format}
else
  # PPTXなど他のフォーマット
  "${quartoPath}/quarto" render "${path.basename(qmdFilePath)}" --to ${format}
fi

EXIT_CODE=$?
echo "変換終了: $(date), 終了コード: $EXIT_CODE"

# 環境をデアクティベート (必要に応じて継続)
# deactivate

# 出力ファイルを確認 (basenameを使用)
if [ -f "${path.basename(outputFilePath)}" ] && [ -s "${path.basename(outputFilePath)}" ]; then
  echo "生成ファイル: $(du -h "${path.basename(outputFilePath)}" | cut -f1)"
  exit $EXIT_CODE
else
  echo "エラー: ファイル生成失敗 (${path.basename(outputFilePath)}が見つからないか空です)"
  # 変換時のstderrも確認すると良い
  exit 1
fi
`
      
      log(`シェルスクリプト作成: ${scriptPath}`)
      await fs.writeFile(scriptPath, scriptContent)
      await fs.chmod(scriptPath, 0o755) // 実行権限を付与
      
      log(`シェルスクリプト内容:\n${scriptContent}`)
      
      // シェルスクリプト実行
      log(`シェルスクリプト実行: ${scriptPath}`)
      
      await new Promise<void>((resolve, reject) => {
        log('スクリプト実行開始...')
        
        // タイムアウトタイマー
        const timeoutId = setTimeout(() => {
          log(`タイムアウト発生: ${TIMEOUT_MS}ms 経過`)
          reject(new Error(`スクリプト実行がタイムアウトしました: ${TIMEOUT_MS}ms`))
        }, TIMEOUT_MS)
        
        // シェルスクリプトを実行 (CWD を tmpDir に変更)
        const childProcess = spawn(scriptPath, [], {
          shell: true,
          cwd: tmpDir // CWDをtmpDirに設定
        })
        
        // プロセスIDをログ出力
        if (childProcess.pid) {
          log(`プロセスID: ${childProcess.pid}`)
        }
        
        let stdoutData = ''
        let stderrData = ''
        
        // 標準出力
        childProcess.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString()
          stdoutData += chunk
          log(`スクリプト stdout: ${chunk}`)
        })
        
        // 標準エラー出力
        childProcess.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString()
          stderrData += chunk
          log(`スクリプト stderr: ${chunk}`)
        })
        
        // プロセス終了時の処理
        childProcess.on('close', (code: number | null) => {
          clearTimeout(timeoutId)
          log(`スクリプト終了 (コード: ${code})`)
          
          if (code === 0) {
            log(`スクリプト完了 (stdout: ${stdoutData.length}文字, stderr: ${stderrData.length}文字)`)
            resolve()
          } else {
            log(`スクリプトエラー - 出力: ${stdoutData}\nエラー: ${stderrData}`)
            reject(new Error(`変換スクリプト失敗 (コード: ${code})`))
          }
        })
        
        // エラー処理
        childProcess.on('error', (err: Error) => {
          clearTimeout(timeoutId)
          log(`スクリプト実行エラー: ${err.message}`)
          reject(err)
        })
      })
      
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
      } else if (format === 'pdf') {
        contentType = 'application/pdf'
        fileName = 'document.pdf'
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