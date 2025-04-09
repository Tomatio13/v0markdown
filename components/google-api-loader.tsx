"use client"

import Script from "next/script"

export default function GoogleApiLoader() {
  // APIキーが設定されている場合のみスクリプトをロードする（任意）
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

  // console.log('Google API Key:', apiKey ? '設定済み' : '未設定'); // デバッグ用

  // APIキーがない場合、または strategy="beforeInteractive" などで即時ロードが必要ない場合は
  // 何もレンダリングしないか、別の処理を行うことも検討できます。
  // ここでは、キーがなくてもロードを試みます（ライブラリによってはキーなしでも一部機能が使える場合があるため）。

  return (
    <Script
      src="https://apis.google.com/js/api.js"
      strategy="lazyOnload"
      onLoad={() => {
        console.log('Google API Client ライブラリがロードされました')
        // gapi.load('client', () => { ... }) のような初期化処理は
        // 実際にAPIを使用するコンポーネント側で行うのが一般的です。
      }}
      onError={(e) => {
        console.error('Google API Client ライブラリのロードに失敗しました:', e)
      }}
    />
  )
} 