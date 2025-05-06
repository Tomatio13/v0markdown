"use client"

import React from 'react'
import MarpPreview from './marp-preview'
import MarpSlideViewer from './marp-slide-viewer'

interface MarpPreviewContainerProps {
  markdown: string
  isDarkMode?: boolean
  mode: 'realtime' | 'slide'
}

export default function MarpPreviewContainer({ markdown, isDarkMode = false, mode }: MarpPreviewContainerProps) {
  return (
    <div className="marp-preview-container" style={{ 
      height: '100%', 
      width: '100%',
      margin: 0,
      padding: 0,
      display: 'flex', 
      flexDirection: 'column' 
    }}>      
      <div className="preview-content" style={{ 
        flexGrow: 1, 
        height: '100%',
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        {mode === 'realtime' ? (
          <MarpPreview markdown={markdown} isDarkMode={isDarkMode} />
        ) : (
          <MarpSlideViewer markdown={markdown} isDarkMode={isDarkMode} />
        )}
      </div>
    </div>
  )
} 