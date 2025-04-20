import { useEffect, useRef } from 'react'
import { saveDraft, createDraftId } from '@/lib/draft-storage'

interface Options {
  content: string
  fileId?: string
  debounceMs?: number
}

export const useAutoSave = ({ content, fileId, debounceMs = 800 }: Options) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialId = (() => {
    if (typeof window === 'undefined') return createDraftId()
    const existing = localStorage.getItem('lastDraftId')
    if (existing) return existing
    const id = createDraftId()
    localStorage.setItem('lastDraftId', id)
    return id
  })()
  const draftIdRef = useRef<string>(initialId)

  useEffect(() => {
    if (!content) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await saveDraft({ id: draftIdRef.current, content, updatedAt: Date.now(), fileId })
      if (typeof window !== 'undefined') localStorage.setItem('lastDraftId', draftIdRef.current)
    }, debounceMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [content, fileId, debounceMs])
} 