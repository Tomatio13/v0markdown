import { useEffect, useRef } from 'react'
import { saveDraft, createDraftId } from '@/lib/draft-storage'

interface Options {
  content: string
  fileId?: string
  debounceMs?: number
}

export const useAutoSave = ({ content, fileId, debounceMs = 800 }: Options) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftIdRef = useRef<string>(createDraftId())

  useEffect(() => {
    if (!content) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await saveDraft({ id: draftIdRef.current, content, updatedAt: Date.now(), fileId })
    }, debounceMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [content, fileId, debounceMs])
} 