import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import type { GoogleFile } from '@/lib/types' // 型定義のインポート

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1]

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 })
  }

  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: token })
    const drive = google.drive({ version: 'v3', auth })

    const response = await drive.files.list({
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime)',
      q: "(mimeType='text/markdown' or mimeType='application/vnd.google-apps.document') and trashed = false",
      orderBy: 'modifiedTime desc'
    })

    // 型の安全性を確保するためにマッピングを行う
    const files: GoogleFile[] = (response.data.files || []).map(file => ({
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime
    }))

    return NextResponse.json(files)
  } catch (error: any) {
    console.error('Error listing Google Drive files:', error)
    const statusCode = error.code === 401 ? 401 : 500
    const message = error.code === 401
      ? 'Unauthorized: Invalid or expired token'
      : 'Failed to list files from Google Drive'
    return NextResponse.json({ message, error: error.message }, { status: statusCode })
  }
} 