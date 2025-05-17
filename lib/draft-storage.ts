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

/**
 * ドラフトを保存する関数
 * @param id ドラフトID
 * @param content ドラフトの内容
 * @returns 保存が成功したかどうか
 */
export async function saveDraftLocal(id: string, content: string): Promise<boolean> {
  try {
    localStorage.setItem(id, content);
    return true;
  } catch (error) {
    console.error('ドラフトの保存に失敗しました:', error);
    return false;
  }
}

/**
 * ドラフトを読み込む関数
 * @param id ドラフトID
 * @returns ドラフトの内容（見つからない場合はnull）
 */
export async function loadDraftLocal(id: string): Promise<{ content: string } | null> {
  try {
    const content = localStorage.getItem(id);
    if (!content) return null;
    
    return { content };
  } catch (error) {
    console.error('ドラフトの読み込みに失敗しました:', error);
    return null;
  }
}

/**
 * ドラフトを削除する関数
 * @param id ドラフトID
 * @returns 削除が成功したかどうか
 */
export async function deleteDraftLocal(id: string): Promise<boolean> {
  try {
    localStorage.removeItem(id);
    return true;
  } catch (error) {
    console.error('ドラフトの削除に失敗しました:', error);
    return false;
  }
} 