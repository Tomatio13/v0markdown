import { IncomingForm } from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// public/images ディレクトリのパス
const uploadDir = path.join(process.cwd(), 'public', 'images');

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const config = {
  api: {
    bodyParser: false, // formidableでリクエストボディをパースするため、Next.jsのbodyParserを無効化
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = new IncomingForm({
    uploadDir: uploadDir,
    keepExtensions: true,
    filename: (name, ext, part, form) => {
      // ファイル名をサニタイズし、一意なIDを付与
      const originalFilename = part.originalFilename || 'unknown';
      const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
      return `${uuidv4()}-${sanitizedFilename}`;
    },
  });

  try {
    const [fields, files] = await form.parse(req);

    const uploadedFile = files.file?.[0]; // 'file'はFormDataのキー名

    if (!uploadedFile) {
      return res.status(400).json({ message: 'ファイルがアップロードされていません。' });
    }

    // 保存されたファイル名を取得
    const fileName = uploadedFile.newFilename;
    const relativeUrl = `/images/${fileName}`;

    console.log(`File uploaded successfully: ${fileName}`);
    console.log(`Relative URL: ${relativeUrl}`);

    return res.status(200).json({ url: relativeUrl });

  } catch (error: any) {
    console.error('ファイルアップロードエラー:', error);
    let errorMessage = 'ファイルアップロードに失敗しました。';
    if (error.message) {
        errorMessage += ` 詳細: ${error.message}`;
    }
    // エラーレスポンスに詳細情報を含める（デバッグ用）
    return res.status(500).json({ message: errorMessage, error: error.message || String(error) });
  }
} 