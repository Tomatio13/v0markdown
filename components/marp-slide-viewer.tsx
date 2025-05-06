"use client"

import React, { useEffect, useRef, useState } from 'react'

interface MarpSlideViewerProps {
  markdown: string
  isDarkMode?: boolean
}

export default function MarpSlideViewer({ markdown, isDarkMode = false }: MarpSlideViewerProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    // APIからHTMLを取得する
    const fetchMarpHtml = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // FormDataの作成
        const formData = new FormData()
        formData.append('markdown', markdown)
        formData.append('format', 'html') // HTMLフォーマットを指定
        
        // API呼び出し
        const response = await fetch('/api/export-to-pptx', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error(`API エラー: ${response.status} ${response.statusText}`)
        }
        
        // レスポンスからHTMLを取得
        const htmlContent = await response.text()
        setHtml(htmlContent)
      } catch (err) {
        console.error('Marp HTML取得エラー:', err)
        setError(err instanceof Error ? err.message : '不明なエラー')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMarpHtml()
  }, [markdown]) // markdownの内容が変わったら再実行

  // HTML内容が更新されたらiframeを更新
  useEffect(() => {
    if (html && iframeRef.current) {
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (iframeDoc) {
        // iframeのdocumentにHTMLを書き込む前に、スタイルを調整するスクリプトを追加
        const bgColor = isDarkMode ? '#1e1e1e' : '#ffffff';
        const textColor = isDarkMode ? '#ffffff' : '#000000';
        const htmlWithStyles = `
<!DOCTYPE html>
<html>
<head>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: ${bgColor};
      color: ${textColor};
    }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .bespoke-marp-parent,
    .bespoke-marp {
      background-color: ${bgColor};
    }
    /* Marpスライドのコントロールスタイル修正 */
    .bespoke-marp-osc {
      bottom: 15px;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;
        
        // iframeのdocumentに修正したHTMLを書き込む
        iframeDoc.open()
        iframeDoc.write(htmlWithStyles)
        iframeDoc.close()
        
        // ダークモードのスタイルをiframeに適用
        if (isDarkMode) {
          try {
            const style = iframeDoc.createElement('style')
            style.textContent = `
              :root {
                color-scheme: dark;
              }
              body {
                background-color: #1e1e1e !important;
                color: #ffffff !important;
              }
            `
            iframeDoc.head.appendChild(style)
          } catch (error) {
            console.error('ダークモードスタイル適用エラー:', error)
          }
        }
        
        // iframeのサイズを調整
        try {
          iframe.style.height = '100%'
          iframe.style.width = '100%'
        } catch (error) {
          console.error('iframeサイズ調整エラー:', error)
        }
      }
    }
  }, [html, isDarkMode])

  return (
    <div 
      ref={containerRef}
      className={`marp-slide-viewer ${isDarkMode ? 'dark' : ''}`}
      style={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {loading && (
        <div className="loading-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          zIndex: 10
        }}>
          <div className="loading-text" style={{
            color: isDarkMode ? '#ffffff' : '#333333',
            fontSize: '1.2rem'
          }}>
            読み込み中...
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-message" style={{
          padding: '1rem',
          color: '#ff5555',
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f8f8f8',
          border: '1px solid #ff5555',
          borderRadius: '0.25rem',
          margin: '1rem'
        }}>
          <h3>エラーが発生しました：</h3>
          <p>{error}</p>
        </div>
      )}
      
      {!loading && !error && (
        <iframe
          ref={iframeRef}
          style={{
            border: 'none',
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            position: 'absolute',
            top: 0,
            left: 0
          }}
          title="Marp Slide"
          sandbox="allow-same-origin allow-scripts"
        />
      )}
    </div>
  )
} 