import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import GoogleAuthProvider from "@/components/google-auth-provider"
import GoogleApiLoader from "@/components/google-api-loader"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Markdown Editor",
  description: "GitHub Flavored Markdown Editor with real-time preview",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <GoogleAuthProvider>
            {children}
            <GoogleApiLoader />
          </GoogleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

import './globals.css'