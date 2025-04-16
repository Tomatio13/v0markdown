import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

// public/images ディレクトリのパス
const imagesDir = path.join(process.cwd(), 'public', 'images');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const filename = req.query.filename as string;

  // ファイル名が指定されていない、または不正な文字が含まれている場合はエラー
  if (!filename || typeof filename !== 'string' || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ message: '不正なファイル名です。' });
  }

  const filePath = path.join(imagesDir, filename);

  try {
    // ファイルの存在を確認
    await fs.promises.access(filePath, fs.constants.R_OK);

    // ファイルの拡張子からContent-Typeを推測
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // キャッシュ制御 (ブラウザがキャッシュするように設定)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // ファイルストリームを作成してレスポンスにパイプ
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

    // エラーハンドリング
    stream.on('error', (err) => {
      console.error('ファイルストリームエラー:', err);
      // レスポンスが既に送信されている場合があるため、try-catchで囲む
      try {
        res.status(500).json({ message: 'ファイルの読み込み中にエラーが発生しました。' });
      } catch (e) {
        console.error('レスポンス送信エラー:', e);
      }
    });

  } catch (error: any) {
    // ファイルが存在しないか、アクセス権がない場合
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      console.error(`画像が見つかりません: ${filename}`);
      return res.status(404).json({ message: '画像が見つかりません。' });
    }
    console.error('画像配信エラー:', error);
    return res.status(500).json({ message: 'サーバーエラーが発生しました。' });
  }
} 