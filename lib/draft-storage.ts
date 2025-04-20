import { get, set, del, keys } from 'idb-keyval'
import { v4 as uuidv4 } from 'uuid'

export interface Draft {
  id: string
  content: string
  updatedAt: number
  fileId?: string
}

export const saveDraft = async (draft: Draft) => {
  await set(draft.id, draft)
}

export const loadDraft = (id: string) => get<Draft>(id)

export const deleteDraft = (id: string) => del(id)

export const gcDrafts = async (ttlDays = 30) => {
  const now = Date.now()
  const limit = ttlDays * 864e5
  for (const key of await keys()) {
    const d = await get<Draft>(key as string)
    if (d && now - d.updatedAt > limit) {
      await del(key as string)
    }
  }
}

export const createDraftId = () => uuidv4() 