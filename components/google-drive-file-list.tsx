"use client"

import { useEffect, useState, useCallback } from 'react'
// GoogleFile型をインポート（API Routeから返される型）
// 実際のAPI Routeのレスポンスに合わせて調整が必要な場合があります
import type { GoogleFile } from '@/lib/types' // 型定義ファイルパスは適宜変更
import { format } from 'date-fns'
import { FileTextIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GoogleDriveFileListProps {
  accessToken: string | null
  onFileSelect: (file: GoogleFile) => void
  selectedFileId?: string
}

export default function GoogleDriveFileList({
  accessToken,
  onFileSelect,
  selectedFileId
}: GoogleDriveFileListProps) {
  const [files, setFiles] = useState<GoogleFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    if (!accessToken) {
      setFiles([])
      setError('認証されていません')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/drive/list', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const fileList: GoogleFile[] = await response.json()
      setFiles(fileList)
    } catch (err: any) {
      console.error('ファイル一覧の取得に失敗:', err)
      setError(err.message || 'Google Driveからファイル一覧を取得できませんでした')
    } finally {
      setLoading(false)
    }
  }, [accessToken]) // accessTokenが変更されたら再実行

  useEffect(() => {
    loadFiles() // 初回ロードおよびaccessToken変更時に実行
  }, [loadFiles])

  if (!accessToken) {
    return (
      <div className="h-full border-r p-4 flex items-center justify-center text-muted-foreground text-sm">
        Google Driveに接続してください。
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto border-r p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Google Driveファイル</h2>
        <Button variant="ghost" size="icon" onClick={loadFiles} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="text-red-500 mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center flex-grow">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 && !error ? (
        <div className="text-muted-foreground text-sm flex-grow flex items-center justify-center">
          Markdownファイルがありません
        </div>
      ) : (
        <ul className="space-y-1 flex-grow">
          {files.map(file => (
            <li
              key={file.id}
              className={`rounded p-2 cursor-pointer flex items-center text-sm
                ${selectedFileId === file.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
              onClick={() => onFileSelect(file)}
            >
              <FileTextIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <div className="truncate font-medium">{file.name}</div>
                {file.modifiedTime && (
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(file.modifiedTime), 'yyyy/MM/dd HH:mm')}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
} 