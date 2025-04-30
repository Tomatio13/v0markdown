"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Marp } from '@marp-team/marp-core'
import mermaid from 'mermaid'

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
        // mermaid.jsによるレンダリングのため、Marp側のMermaidサポートは無効化も検討
        // mermaid: false, // 必要に応じて
      })

      // マークダウンをHTMLに変換
      const { html, css } = marp.render(markdown)
      
      // スタイルとHTMLを結合 (Mermaid要素を後で処理するためクラス付与)
      const combinedHtml = `
        <style>${css}</style>
        <div class="marpit mermaid-container">${html}</div> 
      `
      
      setHtml(combinedHtml)
    } catch (error) {
      console.error('Marpレンダリングエラー:', error)
      setHtml(`<div class="error">Marpレンダリングエラー: ${error instanceof Error ? error.message : '不明なエラー'}</div>`)
    }
  }, [markdown])

  useEffect(() => {
    if (html && containerRef.current) {
      try {
        // Mermaidの初期化設定
        mermaid.initialize({
          startOnLoad: false, // 手動でレンダリングするためfalse
          theme: isDarkMode ? 'dark' : 'default',
          // 必要に応じて他のMermaid設定を追加
          // securityLevel: 'loose', // ローカル環境などで必要になる場合
        });
        
        // コンテナ内のMermaid要素をレンダリング
        // Marp Coreは通常 <pre><code class="language-mermaid">...</code></pre> を生成します
        // そのため、明示的にセレクターで指定して run を呼び出す方が確実です
        const mermaidElements = containerRef.current.querySelectorAll('pre code.language-mermaid');
        if (mermaidElements.length > 0) {
           // `run` メソッドを呼び出してレンダリングを実行
           // `run` は非同期で SVG を挿入するため、コールバック内で後処理が可能
           mermaid.run({ nodes: mermaidElements as NodeListOf<HTMLElement> });
        }

        // Marp Coreの render() が <div class="mermaid">...</div> を直接生成する場合の互換性処理
        // (Marpのバージョンや設定による挙動の違いを考慮)
        const legacyMermaidDivs = containerRef.current.querySelectorAll('div.mermaid');
        if (legacyMermaidDivs.length > 0) {
           mermaid.run({ nodes: legacyMermaidDivs as NodeListOf<HTMLElement> });
        }

      } catch (error) {
        console.error('Mermaidレンダリングエラー:', error);
        // エラー表示用の処理をここに追加することも可能
      }
    }
  }, [html, isDarkMode]); // htmlの内容またはダークモードが変わったら再実行

  return (
    <div 
      ref={containerRef}
      className={`marp-preview mermaid-container ${isDarkMode ? 'dark' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        height: '100%',
        overflow: 'auto',
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
      }}
    />
  )
} 