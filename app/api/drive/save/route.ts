import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

async function handleSave(req: NextRequest, method: 'POST' | 'PUT') {
  const token = req.headers.get('authorization')?.split(' ')[1]
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ message: 'Bad Request: Invalid JSON body' }, { status: 400 });
  }

  const { name, content, fileId } = body

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 })
  }

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ message: 'Bad Request: Missing or invalid name' }, { status: 400 })
  }
  if (content === undefined || content === null) {
    return NextResponse.json({ message: 'Bad Request: Missing content' }, { status: 400 })
  }
  if (method === 'PUT' && (!fileId || typeof fileId !== 'string')) {
    return NextResponse.json({ message: 'Bad Request: Missing or invalid fileId for update' }, { status: 400 })
  }

  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: token })
    const drive = google.drive({ version: 'v3', auth })

    const fileMetadata = {
      name,
      mimeType: 'text/markdown'
    };
    const media = {
      mimeType: 'text/markdown',
      body: String(content) // Ensure content is a string
    };

    let response;
    if (method === 'PUT' && fileId) {
      // 既存ファイルの更新 (PUTリクエスト)
      response = await drive.files.update({
        fileId,
        requestBody: fileMetadata,
        media,
        fields: 'id, name, modifiedTime' // 更新後の情報を取得
      });
    } else {
      // 新規ファイルの作成 (POSTリクエスト)
      response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, modifiedTime' // 作成後の情報を取得
      });
    }

    // 型の安全性を確保
    const savedFile = {
      id: response.data.id || '',
      name: response.data.name || '',
      modifiedTime: response.data.modifiedTime
    }
    if (!savedFile.id) {
      throw new Error('File ID is undefined after save/update');
    }

    return NextResponse.json(savedFile, { status: method === 'POST' ? 201 : 200 })

  } catch (error: any) {
    console.error('Error saving Google Drive file:', error)
    const statusCode = error.code === 401 ? 401 : 500
    const message = statusCode === 401
      ? 'Unauthorized: Invalid or expired token'
      : 'Failed to save file to Google Drive'
    return NextResponse.json({ message, error: error.message }, { status: statusCode })
  }
}

export async function POST(req: NextRequest) {
  return handleSave(req, 'POST');
}

export async function PUT(req: NextRequest) {
  return handleSave(req, 'PUT');
} 