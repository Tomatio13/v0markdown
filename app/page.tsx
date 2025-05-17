"use client"

import dynamic from 'next/dynamic'
import React from 'react'

// SSRを無効化してクライアントサイドのみでレンダリング
const DocumentManager = dynamic(() => import('@/components/document-manager'), { 
  ssr: false
})

export default function Home() {
  return (
    <main className="h-screen">
      <DocumentManager />
    </main>
  )
}

