"use client"

import React, { useEffect, useRef, useState } from 'react'

interface QuartoPreviewProps {
  markdown: string
  isDarkMode?: boolean
}

export default function QuartoPreview({ markdown, isDarkMode = false }: QuartoPreviewProps) {
  const [html, setHtml] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const convertToHtml = async () => {
      if (!markdown.trim()) {
        setHtml('')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // FormDataの準備
        const formData = new FormData()
        formData.append('markdown', markdown)
        formData.append('format', 'html')

        // APIを呼び出してHTML変換
        const response = await fetch('/api/export-to-quarto', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          let errorMessage = 'HTML変換エラー'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || 'HTML変換エラー'
          } catch (e) {
            const errorText = await response.text()
            errorMessage = errorText || 'HTML変換エラー'
          }
          throw new Error(errorMessage)
        }

        // HTMLコンテンツを取得
        const htmlContent = await response.text()
        setHtml(htmlContent)
      } catch (error) {
        console.error('Quarto HTML変換エラー:', error)
        setError(error instanceof Error ? error.message : '不明なエラー')
        setHtml(`<div class="error">変換エラー: ${error instanceof Error ? error.message : '不明なエラー'}</div>`)
      } finally {
        setIsLoading(false)
      }
    }

    // markdownが変更されたらHTML変換を実行
    const timer = setTimeout(() => {
      convertToHtml()
    }, 1000) // 1秒のディレイを設定して頻繁な変換を防止

    return () => clearTimeout(timer)
  }, [markdown])

  return (
    <div className="quarto-preview-container h-full flex flex-col">
      {isLoading && (
        <div className="flex items-center justify-center p-4 text-center">
          <div className="animate-spin mr-2">⌛</div>
          <div>HTML変換中です。しばらくお待ちください...</div>
        </div>
      )}
      
      {error && !isLoading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded m-4">
          <p className="font-bold">エラーが発生しました</p>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && html && (
        <iframe
          ref={iframeRef}
          className={`flex-grow w-full min-h-[80vh] ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
          srcDoc={html}
          sandbox="allow-scripts allow-same-origin"
          title="Quarto Preview"
          style={{ height: 'calc(100vh - 10rem)' }}
        />
      )}

      {!isLoading && !html && !error && (
        <div className="flex items-center justify-center h-full text-gray-500">
          プレビューできるコンテンツがありません
        </div>
      )}
    </div>
  )
} 