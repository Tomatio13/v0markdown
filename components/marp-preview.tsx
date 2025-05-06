"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Marp } from '@marp-team/marp-core'
import mermaid from 'mermaid'

interface MarpPreviewProps {
  markdown: string
  isDarkMode?: boolean
}

// YAMLフロントマターからテーマ名を抽出するヘルパー関数
const extractThemeFromFrontmatter = (md: string): string | null => {
  // 確実に文字列化して改行で分割
  const lines = String(md).split('\n');
  console.log('Total lines:', lines.length);
  
  // 先頭の --- を探す
  let frontmatterStartIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].trim() === '---') {
      frontmatterStartIndex = i;
      break;
    }
  }
  
  // フロントマターの開始が見つからなかった
  if (frontmatterStartIndex === -1) {
    console.log('フロントマターの開始 (---) が見つかりません');
    return null;
  }
  
  // 終了の --- を探す
  let frontmatterEndIndex = -1;
  for (let i = frontmatterStartIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      frontmatterEndIndex = i;
      break;
    }
  }
  
  // フロントマターの終了が見つからなかった
  if (frontmatterEndIndex === -1) {
    console.log('フロントマターの終了 (---) が見つかりません');
    return null;
  }
  
  // フロントマターの内容を抽出
  const frontmatterLines = lines.slice(frontmatterStartIndex + 1, frontmatterEndIndex);
  console.log('フロントマターの行数:', frontmatterLines.length);
  console.log('フロントマターの内容:', frontmatterLines);
  
  // theme: の行を探す
  for (const line of frontmatterLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('theme:')) {
      // theme: の後の値を抽出
      const themeValue = trimmedLine.substring('theme:'.length).trim();
      console.log('発見したテーマ:', themeValue);
      return themeValue;
    }
  }
  
  console.log('フロントマター内にテーマ指定が見つかりません');
  return null;
};

export default function MarpPreview({ markdown, isDarkMode = false }: MarpPreviewProps) {
  const [html, setHtml] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Marpレンダリング処理を非同期関数に
    const renderMarp = async () => {
      try {
        // Marpインスタンスの作成
        const marp = new Marp({
          html: true,
          math: true,
          // mermaid.jsによるレンダリングのため、Marp側のMermaidサポートは無効化も検討
          // mermaid: false, // 必要に応じて
        });

        // 1. テーマ名を抽出
        const themeName = extractThemeFromFrontmatter(markdown);

        // 2. カスタムテーマCSSを取得して Marp に登録
        if (themeName) {
          try {
            const cssPath = `/marp_themes/${themeName}.css`;
            const response = await fetch(cssPath);
            if (response.ok) {
              const themeCss = await response.text();
              // Marp インスタンスにカスタムテーマを追加
              marp.themeSet.add(themeCss);
              console.log(`カスタムテーマCSSを Marp に登録しました: ${themeName}.css`);
            } else {
              console.warn(`カスタムテーマCSSが見つかりません (${response.status}): ${cssPath}`);
            }
          } catch (fetchError) {
            console.error('カスタムテーマCSSの取得エラー:', fetchError);
          }
        }

        // 3. マークダウンをHTMLに変換 (カスタムテーマがある場合は Marp が自動適用)
        const { html: marpHtml, css: marpCss } = marp.render(markdown);

        // 4. Marp が生成した CSS をそのまま使用 (すでにテーマ適用後の CSS)
        const combinedCss = `\n${marpCss}\n`;
        
        // 5. スタイルとHTMLを結合 (Mermaid要素を後で処理するためクラス付与)
        const combinedHtml = `
<style>${combinedCss}</style>
<div class="marpit mermaid-container">${marpHtml}</div> 
`;
        
        setHtml(combinedHtml);
      } catch (error) {
        console.error('Marpレンダリングエラー:', error);
        setHtml(`<div class="error">Marpレンダリングエラー: ${error instanceof Error ? error.message : '不明なエラー'}</div>`);
      }
    };

    renderMarp(); // 非同期関数を実行

  }, [markdown]); // markdownの内容が変わったら再実行

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