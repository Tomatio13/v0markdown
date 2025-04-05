"use client"

import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidDiagramProps {
  chart: string
  className?: string
}

// Mermaidを一度だけ初期化するためのフラグ
let mermaidInitialized = false;

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className }) => {
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [id] = useState(`mermaid-${Math.random().toString(36).substr(2, 9)}`)
  const renderAttempts = useRef(0)

  // Mermaidの初期化
  useEffect(() => {
    if (!mermaidInitialized) {
      try {
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false, // 自動ロードを無効にして手動で制御
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: '"Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", Meiryo, メイリオ, sans-serif',
          // 線の色だけを白に設定
          themeVariables: {
            lineColor: 'white',
            edgeColor: 'white',
            flowchartStroke: 'white'
          }
        })
        mermaidInitialized = true
        console.log('Mermaid initialized successfully')
      } catch (err) {
        console.error('Mermaid initialization error:', err)
      }
    }
  }, [])

  // チャートのレンダリング
  useEffect(() => {
    // チャートのテキストが空または無効な場合は処理をスキップ
    if (!chart || chart.trim() === '') {
      setError('図のコードが空です')
      return
    }

    const renderChart = async () => {
      try {
        renderAttempts.current += 1
        
        // チャートをレンダリング
        console.log(`Rendering chart (attempt ${renderAttempts.current}):`, chart.substring(0, 50) + '...')
        
        // mermaid.parseコードを追加して構文を事前検証
        try {
          mermaid.parse(chart)
        } catch (parseError: any) {
          console.error('Mermaid parse error:', parseError)
          setError(`図の構文エラー: ${parseError.message || '構文を確認してください'}`)
          return
        }
        
        const { svg } = await mermaid.render(id, chart)
        setSvgContent(svg)
        setError('')
      } catch (err: any) {
        console.error('Mermaid rendering error:', err)
        
        // 最大3回まで再試行
        if (renderAttempts.current < 3) {
          console.log(`Retrying render (${renderAttempts.current}/3)...`)
          setTimeout(renderChart, 500) // 500ms後に再試行
        } else {
          setError(`図の描画エラー: ${err.message || '構文を確認してください'}`)
        }
      }
    }

    // レンダリングを少し遅延させて実行（初期化が完了するのを待つ）
    const timerId = setTimeout(() => {
      renderChart()
    }, 100)

    return () => {
      clearTimeout(timerId)
    }
  }, [chart, id])

  // ダークモードの変更を検出して再レンダリング
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          mutation.target === document.documentElement
        ) {
          // Mermaidのテーマを更新
          mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: '"Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W3", Meiryo, メイリオ, sans-serif',
            // 線の色だけを白に設定
            themeVariables: {
              lineColor: 'white',
              edgeColor: 'white',
              flowchartStroke: 'white'
            }
          })
          
          // チャートが存在する場合のみ再レンダリング
          if (chart && chart.trim() !== '') {
            renderAttempts.current = 0
            mermaid.render(id, chart).then(({ svg }) => {
              setSvgContent(svg)
            }).catch((err: any) => {
              console.error('Mermaid re-rendering error:', err)
              setError(`図の描画エラー: ${err.message || '構文を確認してください'}`)
            })
          }
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [chart, id])

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded text-red-600 dark:text-red-400">
        {error}
        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto text-sm">
          {chart || 'コードがありません'}
        </pre>
      </div>
    )
  }

  return (
    <div className={`mermaid-diagram ${className || ''} flex justify-center`}>
      {svgContent ? (
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      ) : (
        <div className="flex justify-center items-center p-4 border border-gray-200 dark:border-gray-700 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-gray-200" />
        </div>
      )}
    </div>
  )
}

export default MermaidDiagram 