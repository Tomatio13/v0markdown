"use client"

import { GoogleOAuthProvider } from '@react-oauth/google'
import { ReactNode, useEffect, useState } from 'react'

interface GoogleAuthProviderProps {
  children: ReactNode
}

export default function GoogleAuthProvider({ children }: GoogleAuthProviderProps) {
  const [clientId, setClientId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    setClientId(id)
    
    if (!id) {
      console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.')
    } else {
      console.log('Google OAuth Client ID loaded.')
    }
  }, [])
  
  if (!isClient || clientId === null) {
    return <div>Loading Auth Provider...</div>;
  }

  if (clientId && clientId.length > 0) {
    return (
      <GoogleOAuthProvider clientId={clientId}>
        {children}
      </GoogleOAuthProvider>
    )
  }

  console.warn("GoogleOAuthProvider is not rendered because clientId is empty.");
  return <>{children}</>
} 