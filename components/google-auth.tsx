"use client"

import { useEffect, useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { useGoogleLogin, googleLogout } from '@react-oauth/google'
import { UploadCloud, LogOut } from 'lucide-react'

interface GoogleAuthProps {
  // 認証状態とアクセストークンを渡す
  onAuthChange: (isAuthenticated: boolean, token?: string) => void
}

export default function GoogleAuth({ onAuthChange }: GoogleAuthProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // セッションストレージからトークンを読み込む（ここでは例として保持）
  // 注意: アクセストークンは有効期限が短いため、リフレッシュトークンを使うか、
  // セッションごとにログインし直すのが一般的です。
  // ここではシンプル化のため、セッションストレージに一時保存します。
  useEffect(() => {
    const storedToken = sessionStorage.getItem('googleAccessToken')
    if (storedToken) {
      // TODO: 本番環境ではトークンの有効性検証が必要
      setAccessToken(storedToken)
      onAuthChange(true, storedToken)
    }
  }, [onAuthChange])

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      const token = tokenResponse.access_token
      setAccessToken(token)
      sessionStorage.setItem('googleAccessToken', token)
      onAuthChange(true, token)
      console.log('Googleログイン成功、アクセストークン取得:', token)
    },
    onError: (errorResponse) => {
      console.error('Googleログインエラー:', errorResponse)
      onAuthChange(false)
      // エラーハンドリング (例: ユーザーへの通知)
      alert(`ログインに失敗しました: ${errorResponse.error_description || '不明なエラー'}`)
    },
    // Google Drive APIに必要なスコープを指定
    scope: 'https://www.googleapis.com/auth/drive.file',
    // ux_mode: 'popup', // ポップアップで認証する場合
    // flow: 'auth-code', // 認可コードフローを使う場合 (サーバーサイドでのトークン交換が必要)
  });

  const handleLogout = useCallback(() => {
    if (accessToken) {
      googleLogout(); // Googleセッションからログアウト
      setAccessToken(null)
      sessionStorage.removeItem('googleAccessToken')
      onAuthChange(false)
      console.log('Googleログアウト成功')
    }
  }, [accessToken, onAuthChange]);

  return (
    <div className="flex items-center">
      {!accessToken ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => login()}
          className="h-10 w-10"
          title="Login to Google"
        >
          <UploadCloud className="h-6 w-6 opacity-50" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-10 w-10"
          title="Logout from Google"
        >
          <LogOut className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
} 