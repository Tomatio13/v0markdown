import { NextRequest, NextResponse } from 'next/server'
import { exec, spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import util from 'util'; // util.promisifyを使用

const execPromise = util.promisify(exec); // execをPromise化

// デバッグログフラグ（本番環境では false に設定）
const DEBUG = false // ★★★ デバッグ用にtrueにする場合がある ★★★

// --- プレビューから移植: フロントマターからテーマ名を抽出 ---
const extractThemeFromFrontmatter = (md: string): string | null => {
  // 確実に文字列化して改行で分割
  const lines = String(md).split('\n');
  
  // 先頭の --- を探す
  let frontmatterStartIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) { // 先頭10行のみチェック
    if (lines[i].trim() === '---') {
      frontmatterStartIndex = i;
      break;
    }
  }
  if (frontmatterStartIndex === -1) return null; // 開始が見つからない

  // 終了の --- を探す
  let frontmatterEndIndex = -1;
  for (let i = frontmatterStartIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      frontmatterEndIndex = i;
      break;
    }
  }
  if (frontmatterEndIndex === -1) return null; // 終了が見つからない

  // フロントマターの内容を抽出
  const frontmatterLines = lines.slice(frontmatterStartIndex + 1, frontmatterEndIndex);
  
  // theme: の行を探す
  for (const line of frontmatterLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('theme:')) {
      const themeValue = trimmedLine.substring('theme:'.length).trim();
      return themeValue || null; // 空の場合はnullを返す
    }
  }
  
  return null; // theme指定が見つからない
};
// --- 移植ここまで ---


export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const sessionId = uuidv4().substring(0, 8)
  const tmpDir = path.join(os.tmpdir(), `marp-${sessionId}`)
  let processedMdFilePath = ''; // スコープ外でも参照できるように
  let customThemeCssPath = ''; // カスタムテーマCSSの一時ファイルパス
  
  // フォーマット取得（デフォルトはpptx）
  const formData = await request.formData()
  const format = (formData.get('format') as string) || 'pptx'

  // ログヘルパー関数
  const log = (message: string) => {
    if (DEBUG) {
      console.log(`[MARP-${sessionId}] ${message}`)
    }
  }

  log(`処理開始: ${new Date().toISOString()}, フォーマット: ${format}`)

  try {
    log('リクエストデータの解析中...')
    let markdownContent = formData.get('markdown')

    if (!markdownContent || typeof markdownContent !== 'string') {
      log('エラー: マークダウンデータがありません')
      return NextResponse.json({ error: 'マークダウンデータが必要です' }, { status: 400 })
    }

    log(`元のマークダウン文字数: ${markdownContent.length}文字`)

    log(`一時ディレクトリを作成: ${tmpDir}`)
    await fs.mkdir(tmpDir, { recursive: true })

    // --- Puppeteer設定ファイル作成 ---
    const puppeteerConfigPath = path.join(tmpDir, 'puppeteer-config.json');
    const puppeteerConfigContent = JSON.stringify({ args: ['--no-sandbox'] });
    try {
        log(`Puppeteer設定ファイル作成: ${puppeteerConfigPath}`);
        await fs.writeFile(puppeteerConfigPath, puppeteerConfigContent);
    } catch (writeErr) {
        log(`エラー: Puppeteer設定ファイルの書き込みに失敗: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`);
        throw new Error('Puppeteer設定ファイルの作成に失敗しました');
    }
    // --- Puppeteer設定ファイル作成 終了 ---


    // --- Mermaid処理 ---
    log('Mermaidコードブロックの検索と変換開始...')
    const mermaidRegex = /```mermaid\s*([\s\S]*?)```/g;
    const mermaidBlocks = [];
    let match;
    while ((match = mermaidRegex.exec(markdownContent)) !== null) {
        mermaidBlocks.push({ fullMatch: match[0], code: match[1].trim() });
    }

    if (mermaidBlocks.length > 0) {
        log(`${mermaidBlocks.length}個のMermaidブロックを検出`);
        const projectRoot = process.cwd();
        const mmdcPath = path.join(projectRoot, 'node_modules', '.bin', 'mmdc');

        try {
            await fs.access(mmdcPath);
            log(`mmdcパス確認: ${mmdcPath}`);
        } catch (err) {
            log(`エラー: mmdcが見つかりません: ${mmdcPath}`);
            throw new Error(`mermaid-cli (mmdc) が見つかりません。'npm install @mermaid-js/mermaid-cli' を実行してください。`);
        }

        for (let i = 0; i < mermaidBlocks.length; i++) {
            const block = mermaidBlocks[i];
            const mmdInputPath = path.join(tmpDir, `mermaid-input-${i}.mmd`);
            const svgOutputPath = path.join(tmpDir, `mermaid-output-${i}.svg`);
            const svgRelativePath = `./mermaid-output-${i}.svg`;

            log(`[Mermaid ${i}] 一時入力ファイル作成: ${mmdInputPath}`);
            await fs.writeFile(mmdInputPath, block.code);

            // mmdcコマンド実行 (puppeteer設定ファイル -p を追加)
            const mmdcCommand = `"${mmdcPath}" -i "${mmdInputPath}" -o "${svgOutputPath}" -p "${puppeteerConfigPath}" -b transparent`;
            log(`[Mermaid ${i}] mmdc実行: ${mmdcCommand}`);
            try {
                const { stdout, stderr } = await execPromise(mmdcCommand, { cwd: tmpDir });
                if (stderr) {
                    log(`[Mermaid ${i}] mmdc stderr: ${stderr}`);
                }
                log(`[Mermaid ${i}] mmdc stdout: ${stdout}`);
                log(`[Mermaid ${i}] SVG生成成功: ${svgOutputPath}`);

                // Markdown内のコードブロックを <p><img></p> タグに置換し、前後に改行を追加
                const imgTag = `<p><img src="${svgRelativePath}" alt="Mermaid diagram ${i}"></p>`;
                // 前後の改行を保証するために、置換文字列に \n を追加
                markdownContent = markdownContent.replace(block.fullMatch, `\n\n${imgTag}\n\n`);

            } catch (error) {
                log(`[Mermaid ${i}] mmdc実行エラー: ${error instanceof Error ? error.message : String(error)}`);
                 // エラー時も改行を追加しておく
                 const errorBlock = `\n\`\`\`\nError rendering Mermaid diagram ${i}: ${error instanceof Error ? error.message : String(error)}\n\`\`\`\n`;
                 markdownContent = markdownContent.replace(block.fullMatch, `\n\n${errorBlock}\n\n`);
            }
        }
        log('Mermaidコードブロックの置換完了');
    } else {
        log('Mermaidブロックは見つかりませんでした');
    }
    // --- Mermaid処理 終了 ---

    // --- カスタムテーマ処理 ---
    log('カスタムテーマの抽出と読み込み開始...');
    const themeName = extractThemeFromFrontmatter(markdownContent);
    let themeSetOption = ''; // Marp CLI に渡すオプション文字列

    if (themeName) {
        log(`フロントマターからテーマ名 "${themeName}" を抽出しました`);
        const projectRoot = process.cwd();
        const themeFilePath = path.join(projectRoot, 'public', 'marp_themes', `${themeName}.css`);
        log(`カスタムテーマCSSファイルパス: ${themeFilePath}`);

        try {
            const themeCssContent = await fs.readFile(themeFilePath, 'utf-8');
            customThemeCssPath = path.join(tmpDir, 'custom-theme.css'); // 一時ファイルのパス
            log(`カスタムテーマCSSを一時ファイルに書き込み: ${customThemeCssPath}`);
            await fs.writeFile(customThemeCssPath, themeCssContent);
            // シェルスクリプト内で使えるようにファイル名だけを渡す
            themeSetOption = `--theme-set "${path.basename(customThemeCssPath)}"`;
            log(`カスタムテーマ読み込み成功。Marp CLIオプション: ${themeSetOption}`);
        } catch (readError) {
            if (readError instanceof Error && 'code' in readError && readError.code === 'ENOENT') {
                log(`警告: カスタムテーマCSSファイルが見つかりません: ${themeFilePath}。デフォルトテーマを使用します。`);
            } else {
                log(`警告: カスタムテーマCSSファイルの読み込みに失敗しました: ${readError instanceof Error ? readError.message : String(readError)}。デフォルトテーマを使用します。`);
            }
            // エラーが発生しても処理は続行し、themeSetOptionは空のまま
        }
    } else {
        log('フロントマターにテーマ指定が見つかりませんでした。デフォルトテーマを使用します。');
    }
    // --- カスタムテーマ処理 終了 ---


    // ★★★ デバッグログ追加 ★★★
    log(`処理済みマークダウン内容:\n----\n${markdownContent}\n----`);
    // ★★★ デバッグログ追加 終了 ★★★

    // 処理済みマークダウンを一時ファイルに保存
    processedMdFilePath = path.join(tmpDir, 'processed_document.md') // ファイルパスを代入
    log(`処理済みマークダウンファイルを作成: ${processedMdFilePath}`)
    await fs.writeFile(processedMdFilePath, markdownContent)

    // 出力ファイルのパス
    const outputFilePath = path.join(tmpDir, `document.${format}`)
    log(`出力先ファイル: ${outputFilePath}`)

    // marpコマンドの実行
    try {
      // タイムアウトを設定
      const TIMEOUT_MS = 60000; // 60秒に延長
      log(`タイムアウト設定: ${TIMEOUT_MS}ms`);

      // プロジェクトルートディレクトリを取得
      const projectRoot = process.cwd();

      // シェルスクリプトファイルを作成 (入力ファイルを processedMdFilePath に変更)
      const scriptPath = path.join(tmpDir, 'convert.sh');
      // ★★★ themeSetOption をコマンドに追加 ★★★
      const scriptContent = `#!/bin/bash
# tmpDirに移動してmarpを実行 (SVGの相対パス解決のため)
cd "${tmpDir}"
echo "Marp変換開始: $(date)"

# Puppeteerの設定 (念のため継続)
export PUPPETEER_CACHE_DIR="${projectRoot}/node_modules/.cache/puppeteer"
export PUPPETEER_DOWNLOAD_PATH="${projectRoot}/node_modules/.cache/puppeteer"
mkdir -p "$PUPPETEER_CACHE_DIR"

# 出力形式を決定
if [ "${format}" = "html" ]; then
  # HTML生成 (プレビュー用)
  npx @marp-team/marp-cli --html "${path.basename(processedMdFilePath)}" ${themeSetOption} -o "${path.basename(outputFilePath)}" --no-stdin --allow-local-files
else
  # 編集可能なPPTXを生成 (入力は processed_document.md)
  # --html と --allow-local-files はSVG読み込みに必要
  npx @marp-team/marp-cli --html "${path.basename(processedMdFilePath)}" ${themeSetOption} --pptx-editable -o "${path.basename(outputFilePath)}" --no-stdin --allow-local-files
fi

EXIT_CODE=$?
echo "変換終了: $(date), 終了コード: $EXIT_CODE"

if [ -f "${path.basename(outputFilePath)}" ] && [ -s "${path.basename(outputFilePath)}" ]; then
  echo "生成ファイル: $(du -h "${path.basename(outputFilePath)}" | cut -f1)"
  exit $EXIT_CODE
else
  echo "エラー: ファイル生成失敗"
  exit 1
fi
`;

      log(`シェルスクリプト作成: ${scriptPath}`);
      await fs.writeFile(scriptPath, scriptContent);
      await fs.chmod(scriptPath, 0o755);

      log(`シェルスクリプト内容:\n${scriptContent}`);
      log(`シェルスクリプト実行: ${scriptPath}`);

      await new Promise<void>((resolve, reject) => {
        log('スクリプト実行開始...');
        const timeoutId = setTimeout(() => {
          log(`タイムアウト発生: ${TIMEOUT_MS}ms 経過`);
          reject(new Error(`スクリプト実行がタイムアウトしました: ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);

        // スクリプトの実行 (CWDをtmpDirに変更)
        const childProcess = spawn(scriptPath, [], {
          shell: true,
          cwd: tmpDir // CWDをtmpDirに設定
        });

        if (childProcess.pid) log(`プロセスID: ${childProcess.pid}`);
        let stdoutData = '';
        let stderrData = '';

        childProcess.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString(); stdoutData += chunk; log(`スクリプト stdout: ${chunk}`);
        });
        childProcess.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString(); stderrData += chunk; log(`スクリプト stderr: ${chunk}`);
        });
        childProcess.on('close', (code: number | null) => {
          clearTimeout(timeoutId);
          log(`スクリプト終了 (コード: ${code})`);
          if (code === 0) {
            log(`スクリプト完了 (stdout: ${stdoutData.length}文字, stderr: ${stderrData.length}文字)`);
            resolve();
          } else {
            log(`スクリプトエラー - 出力: ${stdoutData}\nエラー: ${stderrData}`);
            reject(new Error(`変換スクリプト失敗 (コード: ${code}). Marp stderr: ${stderrData || 'No stderr output'}`));
          }
        });
        childProcess.on('error', (err: Error) => {
          clearTimeout(timeoutId); log(`スクリプト実行エラー: ${err.message}`); reject(err);
        });
      });

      // ファイルが存在するか確認
      try {
        const fileStats = await fs.stat(outputFilePath)
        log(`出力ファイル生成確認: ${fileStats.size} バイト`)
        if (fileStats.size === 0) throw new Error('出力ファイルが空です')
      } catch (statErr) {
        log(`出力ファイル確認エラー: ${statErr instanceof Error ? statErr.message : String(statErr)}`)
        throw new Error('出力ファイルが生成されませんでした')
      }

      // 出力ファイルの読み込み
      log('出力ファイルの読み込み開始')
      const outputData = await fs.readFile(outputFilePath)
      log(`出力ファイル読み込み完了: ${outputData.length} バイト`)

      // 出力ファイルを返す
      const elapsedTime = Date.now() - startTime
      log(`処理完了: ${elapsedTime}ms`)

      // Content-Type の設定
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
      log(`Marp実行エラー: ${errorMessage}`)
      throw error; // エラーを上位に伝播させて finally でクリーンアップ
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log(`全体処理エラー: ${errorMessage}`)
    // クリーンアップはfinallyブロックで行う
    return NextResponse.json(
      { error: `変換中にエラーが発生しました: ${errorMessage}` },
      { status: 500 }
    )
  } finally {
     // クリーンアップ - 一時ファイルの削除 (成功時もエラー時も実行)
    if (tmpDir) {
        log('一時ファイルの削除を開始')
        fs.rm(tmpDir, { recursive: true, force: true })
          .then(() => log('一時ファイル削除完了'))
          .catch(err => log(`一時ファイル削除エラー: ${err.message}`))
    }
  }
} 