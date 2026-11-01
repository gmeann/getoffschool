/**
 * 글쓰기 연속 제한(30초)의 클라이언트 쪽 기록. 게시판 글과 마음 나누기가 함께 씀.
 * 서버 규칙(users/{uid}.lastWriteAt)도 같은 30초를 강제함.
 */
import { POST_COOLDOWN_MS } from '../data/boards'
import { storageGet, storageSet } from '../hooks/clock'

const KEY = 'board:lastPostAt'

export function cooldownLeft(): number {
  const last = Number(storageGet(KEY)) || 0
  return Math.max(0, last + POST_COOLDOWN_MS - Date.now())
}
export function markWrote() {
  storageSet(KEY, String(Date.now()))
}
