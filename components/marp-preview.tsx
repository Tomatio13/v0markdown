"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Marp } from '@marp-team/marp-core'

interface MarpPreviewProps {
  markdown: string
  isDarkMode?: boolean
}

export default function MarpPreview({ markdown, isDarkMode = false }: MarpPreviewProps) {
  const [html, setHtml] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      // Marpインスタンスの作成
      const marp = new Marp({
        html: true,
        math: true,
        // 必要に応じてMarpの設定をここに追加
      })

      // マークダウンをHTMLに変換
      const { html, css } = marp.render(markdown)
      
      // スタイルとHTMLを結合
      const combinedHtml = `
        <style>${css}</style>
        <div class="marpit">${html}</div>
      `
      
      setHtml(combinedHtml)
    } catch (error) {
      console.error('Marpレンダリングエラー:', error)
      setHtml(`<div class="error">Marpレンダリングエラー: ${error instanceof Error ? error.message : '不明なエラー'}</div>`)
    }
  }, [markdown])

  return (
    <div 
      ref={containerRef}
      className={`marp-preview ${isDarkMode ? 'dark' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        height: '100%',
        overflow: 'auto',
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
      }}
    />
  )
} 