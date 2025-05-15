"use client"

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react'
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
  const contentRef = useRef<HTMLDivElement>(null)
  const prevScrollRef = useRef<{ slideId: string | null; yOffset: number }>({ slideId: null, yOffset: 0 })
  const [slidesCount, setSlidesCount] = useState(0)

  useEffect(() => {
    // Marpレンダリング処理を非同期関数に
    const renderMarp = async () => {
      try {
        // 現在のスクロール位置を識別可能な方法で保存（更新前）
        if (containerRef.current && contentRef.current) {
          const container = containerRef.current;
          const slides = contentRef.current.querySelectorAll('section.marpit');
          const scrollPosition = container.scrollTop;
          
          // 現在見えているスライドを検出
          let currentSlideId = null;
          let yOffsetInSlide = 0;
          
          for (let i = 0; i < slides.length; i++) {
            const slide = slides[i] as HTMLElement;
            const slideTop = slide.offsetTop;
            const slideBottom = slideTop + slide.offsetHeight;
            
            if (scrollPosition >= slideTop && scrollPosition < slideBottom) {
              // このスライドが現在見えている
              currentSlideId = slide.id || `slide-${i}`;
              yOffsetInSlide = scrollPosition - slideTop;
              break;
            }
            
            // もし最後までどのスライドも条件に合わなければ、最も近いスライドを選択
            if (i === slides.length - 1 && currentSlideId === null) {
              currentSlideId = slide.id || `slide-${i}`;
              yOffsetInSlide = 0;
            }
          }
          
          // 保存
          prevScrollRef.current = {
            slideId: currentSlideId,
            yOffset: yOffsetInSlide
          };
        }

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
        
        // スライドに一意のIDを付与する処理を追加
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = marpHtml;
        const sections = tempDiv.querySelectorAll('section.marpit');
        sections.forEach((section, index) => {
          if (!section.id) {
            section.id = `slide-${index}`;
          }
        });

        const combinedHtml = `
<style>${combinedCss}</style>
<div class="marpit mermaid-container">${tempDiv.innerHTML}</div> 
`;

        setSlidesCount(sections.length);
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

  // マークダウン表示の処理後、スクロール位置を復元
  useLayoutEffect(() => {
    if (containerRef.current && contentRef.current && html) {
      // Mermaidのレンダリングが完了するまで少し待機
      setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const content = contentRef.current;
        if (!content) return;
        
        const { slideId, yOffset } = prevScrollRef.current;
        
        if (slideId) {
          // IDでスライドを見つける
          const targetSlide = content.querySelector(`#${slideId}`);
          if (targetSlide) {
            // スライドが見つかった場合、その位置にスクロール
            const targetY = (targetSlide as HTMLElement).offsetTop + yOffset;
            container.scrollTop = targetY;
            return;
          }
        }
        
        // IDでスライドが見つからない場合、比率で推定（フォールバック）
        const slides = content.querySelectorAll('section.marpit');
        if (slides.length > 0 && slidesCount > 0) {
          // スライド数の比率で最も近い位置を計算
          const slideRatio = Math.min(slides.length - 1, Math.floor(slidesCount / 2));
          const targetSlide = slides[slideRatio] as HTMLElement;
          if (targetSlide) {
            container.scrollTop = targetSlide.offsetTop;
          }
        }
      }, 50); // 短い待機時間で試す
    }
  }, [html, slidesCount]);

  return (
    <div 
      ref={containerRef}
      className={`marp-preview-wrapper ${isDarkMode ? 'dark' : ''}`}
      style={{
        height: '100%',
        overflow: 'auto',
        backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
      }}
    >
      <div 
        ref={contentRef}
        className="marp-preview-content mermaid-container"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
} 