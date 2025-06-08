import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd()
    
    return NextResponse.json({
      homeDirectory: homeDir,
      workingDirectory: process.cwd(),
      platform: process.platform
    })
  } catch (error) {
    console.error('Terminal init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize terminal' },
      { status: 500 }
    )
  }
}