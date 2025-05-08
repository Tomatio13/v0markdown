"use client";

import { useRef, useEffect, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap, deriveOptions } from 'markmap-view';
import { Toolbar } from 'markmap-toolbar';
// CSSインポートを削除（存在しないファイルのため）

interface MarkmapDiagramProps {
  markdown: string;
  isDarkMode?: boolean;
}

// transformerをコンポーネント外で初期化（再利用可能）
const transformer = new Transformer();

export default function MarkmapDiagram({ markdown, isDarkMode = false }: MarkmapDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const toolbarRef = useRef<HTMLElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [error, setError] = useState<string | null>(null);
  // 初期化完了フラグ
  const initializedRef = useRef(false);
  // 最新のmarkdownを保持
  const lastMarkdownRef = useRef<string>(markdown);
  // スタイル要素参照
  const styleElemRef = useRef<SVGStyleElement | null>(null);

  // コンテナサイズの監視
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({
            width: offsetWidth,
            height: offsetHeight
          });
        }
      }
    };

    // 初期化時とリサイズ時に実行
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // マインドマップの初期化 - 1回限り実行
  useEffect(() => {
    // SVGが存在しない場合は何もしない
    if (!svgRef.current || initializedRef.current) return;
    
    // SVGのセットアップ
    const svg = svgRef.current;
    svg.setAttribute('width', `${dimensions.width}px`);
    svg.setAttribute('height', `${dimensions.height}px`);
    svg.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
    svg.style.background = isDarkMode ? '#1e1e1e' : 'white';
    
    try {
      // マークダウンをマインドマップデータに変換
      const { root } = transformer.transform(markdown);
      
      // 基本的なスタイルをSVGに追加
      const styleElem = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleElemRef.current = styleElem;
      styleElem.textContent = `
        .markmap-link {
          stroke-width: 1.5;
        }
        .markmap-node > circle {
          fill-opacity: 0.8;
        }
        .markmap-node > text {
          fill: ${isDarkMode ? '#ffffff' : '#333333'} !important;
          stroke: ${isDarkMode ? '#000000' : 'none'};
          stroke-width: ${isDarkMode ? '0.5px' : '0'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: ${isDarkMode ? 'bold' : 'normal'};
          paint-order: stroke;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `;
      svg.appendChild(styleElem);
      
      // JSON形式のオプションも更新
      const jsonOptions = {
        // 基本的なオプションのみ設定
        colorFreezeLevel: 9,
        initialExpandLevel: 9,
        placement: 'center'
      };
      
      // オプションの変換
      const options = deriveOptions(jsonOptions);
      
      // クリーンアップ: SVG内の既存要素を削除
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
      
      // 既存のマークマップが存在する場合はnullに設定
      if (markmapRef.current) {
        markmapRef.current = null;
      }
      
      // 新しいマークマップを作成
      markmapRef.current = Markmap.create(svg, options, root);
      
      // ツールバーの作成と追加
      if (containerRef.current && markmapRef.current) {
        // すでに存在するツールバーを削除
        if (toolbarRef.current && toolbarRef.current.parentNode) {
          toolbarRef.current.parentNode.removeChild(toolbarRef.current);
        }
        
        // 新しいツールバーを作成
        const { el } = Toolbar.create(markmapRef.current);
        el.style.position = 'absolute';
        el.style.bottom = '1rem';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)'; // 中央揃え
        el.style.background = isDarkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)';
        el.style.borderRadius = '4px';
        el.style.padding = '4px';
        el.style.boxShadow = isDarkMode 
          ? '0 2px 5px rgba(0, 0, 0, 0.5)' 
          : '0 2px 5px rgba(0, 0, 0, 0.2)';
        
        // ツールバーを横向きに配置
        el.style.display = 'flex';
        el.style.flexDirection = 'row';
        
        // markmapへのリンク要素を削除
        const links = el.querySelectorAll('a');
        links.forEach(link => {
          if (link.getAttribute('href')?.includes('markmap')) {
            link.style.display = 'none';
          }
        });
        
        // ツールバー内のボタンにスタイルを適用
        const buttons = el.querySelectorAll('button');
        buttons.forEach(button => {
          button.style.color = isDarkMode ? '#ffffff' : '#333333';
          button.style.margin = '0 2px';
        });
        
        containerRef.current.appendChild(el);
        toolbarRef.current = el;
      }
      
      initializedRef.current = true;
      lastMarkdownRef.current = markdown;
      
      setError(null);
    } catch (err) {
      console.error("マインドマップの生成に失敗しました:", err);
      setError("マインドマップの生成に失敗しました。マークダウンの書式を確認してください。");
    }
    
    // クリーンアップ関数
    return () => {
      // コンポーネントがアンマウントされる時に実行
      if (markmapRef.current) {
        markmapRef.current = null;
      }
      if (styleElemRef.current) {
        styleElemRef.current = null;
      }
      if (toolbarRef.current && toolbarRef.current.parentNode) {
        toolbarRef.current.parentNode.removeChild(toolbarRef.current);
        toolbarRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [dimensions, isDarkMode]); // 初期化は寸法変更時とダークモード変更時に依存

  // マークダウン変更時の効率的な更新
  useEffect(() => {
    // 初期化前または同じマークダウンなら何もしない
    if (!initializedRef.current || !markmapRef.current || markdown === lastMarkdownRef.current) {
      return;
    }

    try {
      // マークダウンをマインドマップデータに変換
      const { root } = transformer.transform(markdown);
      
      // データのみを更新して部分的にレンダリング
      markmapRef.current.setData(root);
      lastMarkdownRef.current = markdown;
      
      setError(null);
    } catch (err) {
      console.error("マインドマップの更新に失敗しました:", err);
      setError("マインドマップの更新に失敗しました。マークダウンの書式を確認してください。");
    }
  }, [markdown]);

  // ダークモード変更時のスタイル更新
  useEffect(() => {
    if (!initializedRef.current || !styleElemRef.current) return;
    
    // スタイル要素のテキスト内容を更新
    styleElemRef.current.textContent = `
      .markmap-link {
        stroke-width: 1.5;
      }
      .markmap-node > circle {
        fill-opacity: 0.8;
      }
      .markmap-node > text {
        fill: ${isDarkMode ? '#ffffff' : '#333333'} !important;
        stroke: ${isDarkMode ? '#000000' : 'none'};
        stroke-width: ${isDarkMode ? '0.5px' : '0'};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: ${isDarkMode ? 'bold' : 'normal'};
        paint-order: stroke;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `;
    
    // SVGの背景色も更新
    if (svgRef.current) {
      svgRef.current.style.background = isDarkMode ? '#1e1e1e' : 'white';
    }
    
    // ツールバーのスタイルも更新
    if (toolbarRef.current) {
      toolbarRef.current.style.background = isDarkMode 
        ? 'rgba(30, 30, 30, 0.7)' 
        : 'rgba(255, 255, 255, 0.7)';
      
      // ツールバー内のボタンにスタイルを適用
      const buttons = toolbarRef.current.querySelectorAll('button');
      buttons.forEach(button => {
        button.style.color = isDarkMode ? '#ffffff' : '#333333';
      });
      
      // markmapへのリンクを再度非表示に
      const links = toolbarRef.current.querySelectorAll('a');
      links.forEach(link => {
        if (link.getAttribute('href')?.includes('markmap')) {
          link.style.display = 'none';
        }
      });
    }
  }, [isDarkMode]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded mb-2">
          {error}
        </div>
      )}
      <div 
        ref={containerRef} 
        className="markmap-container flex-grow overflow-hidden p-2 relative"
        style={{ minHeight: '400px' }}
      >
        <svg 
          ref={svgRef} 
          width={dimensions.width} 
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{ background: isDarkMode ? '#1e1e1e' : 'white' }}
        />
      </div>
    </div>
  );
} 