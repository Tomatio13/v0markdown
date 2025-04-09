import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1]
  const fileId = req.nextUrl.searchParams.get('fileId')

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 })
  }

  if (!fileId) {
    return NextResponse.json({ message: 'Bad Request: Missing fileId' }, { status: 400 })
  }

  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: token })
    const drive = google.drive({ version: 'v3', auth })

    const response = await drive.files.get({
      fileId,
      alt: 'media'
    }, { responseType: 'text' }) // テキストとして取得

    // NextResponseでテキストデータを返す
    // response.data は any | string | Buffer などになる可能性があるため、stringにキャスト
    return new NextResponse(String(response.data), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }, // Content-Typeを指定
    })

  } catch (error: any) {
    console.error('Error reading Google Drive file:', error)
    const statusCode = error.code === 401 ? 401
                      : error.code === 404 ? 404
                      : 500
    const message = statusCode === 401 ? 'Unauthorized: Invalid or expired token'
                    : statusCode === 404 ? 'File not found'
                    : 'Failed to read file from Google Drive'
    return NextResponse.json({ message, error: error.message }, { status: statusCode })
  }
} 