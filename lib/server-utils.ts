import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * base64データとmimeTypeから一時ファイルを作成し、markitdownでMarkdown化して返す
 * @param base64Data base64エンコードされたファイルデータ
 * @param mimeType ファイルのMIMEタイプ
 * @param fileName ファイル名（拡張子推定用、任意）
 * @returns Markdown文字列
 */
export async function convertFileToMarkdown(base64Data: string, mimeType: string, fileName?: string): Promise<string> {
  // 拡張子推定
  let ext = '';
  if (fileName && fileName.includes('.')) {
    ext = '.' + fileName.split('.').pop();
  } else if (mimeType === 'application/msword') {
    ext = '.doc';
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    ext = '.docx';
  } else if (mimeType === 'application/vnd.ms-excel') {
    ext = '.xls';
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    ext = '.xlsx';
  } else if (mimeType === 'application/vnd.ms-powerpoint') {
    ext = '.ppt';
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    ext = '.pptx';
  } else if (mimeType === 'text/html') {
    ext = '.html';
  } else if (mimeType === 'text/markdown') {
    ext = '.md';
  } else if (mimeType === 'application/rtf') {
    ext = '.rtf';
  } else if (mimeType === 'text/csv') {
    ext = '.csv';
  } else if (mimeType === 'application/json') {
    ext = '.json';
  } else if (mimeType === 'application/xml' || mimeType === 'text/xml') {
    ext = '.xml';
  } else if (mimeType === 'application/pdf') {
    ext = '.pdf';
  } else {
    // その他のファイルタイプには適当な拡張子を設定
    ext = '.bin';
  }

  const tmpDir = os.tmpdir();
  const uuid = uuidv4();
  const inputPath = path.join(tmpDir, `markitdown_input_${uuid}${ext}`);
  const outputPath = path.join(tmpDir, `markitdown_output_${uuid}.md`);

  try {
    // 環境変数からmarkitdownのパスを取得
    const markitdownPath = process.env.MARKITDOWN_PATH;
    if (!markitdownPath) {
      throw new Error('環境変数MARKITDOWN_PATHが設定されていません');
    }

    // base64データをバイナリで書き出し
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(inputPath, buffer);

    // シェルスクリプトを作成して実行
    const scriptPath = path.join(tmpDir, `markitdown_script_${uuid}.sh`);
    const scriptContent = `#!/bin/bash
cd "${markitdownPath}"
source venv/bin/activate
markitdown "${inputPath}" -o "${outputPath}"
deactivate
`;

    await fs.writeFile(scriptPath, scriptContent);
    await fs.chmod(scriptPath, 0o755); // 実行権限を付与

    // シェルスクリプトを実行
    await execPromise(`bash "${scriptPath}"`);

    // 結果を読み込み
    const text = await fs.readFile(outputPath, 'utf-8');
    return text;
  } catch (err) {
    throw new Error(`Markdownへの変換に失敗しました: ${(err as Error).message}`);
  } finally {
    // 一時ファイル削除
    try { await fs.unlink(inputPath); } catch {}
    try { await fs.unlink(outputPath); } catch {}
    try { await fs.unlink(path.join(tmpDir, `markitdown_script_${uuid}.sh`)); } catch {}
  }
} 