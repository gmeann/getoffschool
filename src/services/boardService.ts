/**
 * 연구실 게시판 데이터 서비스 (메모보드·냉장고·칠판).
 *
 * UI 는 이 파일의 `boardService` 만 사용합니다. localStorage 를 직접 읽거나 쓰지 않아요.
 * 지금은 "시드 글(코드 안) + localStorage" 구현이고, 6단계에서 같은 인터페이스를 따르는
 * Firebase 구현을 만들어 맨 아래 `boardService` 한 줄만 바꾸면 됩니다.
 * 모든 함수는 Promise 를 돌려줘서 서버 호출로 바뀌어도 UI 코드는 그대로예요.
 */
import { ANONYMOUS, POST_COOLDOWN_MS, POST_MAX, REASON_MAX, SEED_POSTS, type BoardId, type MemoColor } from '../data/boards'
import { RESET_REQUESTED, storageGet, storageRemovePrefix, storageSet } from '../hooks/clock'
import { checkText } from './moderation'

export type Post = {
  id: string
  board: BoardId
  text: string
  /** 냉장고: 추천 이유 한 줄 */
  reason?: string
  /** 메모보드: 포스트잇 색 */
  color?: MemoColor
  /** 화면에 보일 이름 ("익명의 선생님" 또는 접속 때 받은 무작위 이름) */
  author: string
  createdAt: number
  reactions: number
  /** 내가 반응을 눌렀는지 */
  reacted: boolean
  /** 내가 쓴 글이면 삭제 가능 */
  mine: boolean
}

export type SortMode = 'latest' | 'popular'

export type NewPost = { text: string; reason?: string; color?: MemoColor; author: string }

export type BoardErrorCode = 'invalid' | 'cooldown' | 'not-found'
export class BoardError extends Error {
  code: BoardErrorCode
  /** cooldown 일 때 남은 시간(ms) */
  retryAfterMs?: number
  constructor(code: BoardErrorCode, message: string, retryAfterMs?: number) {
    super(message)
    this.code = code
    this.retryAfterMs = retryAfterMs
  }
}

export interface BoardService {
  getPosts(board: BoardId, sort: SortMode): Promise<Post[]>
  addPost(board: BoardId, post: NewPost): Promise<Post>
  /** 한 글에 한 번만, 다시 누르면 취소. 바뀐 개수와 상태를 돌려줌 */
  toggleReaction(board: BoardId, postId: string): Promise<{ reactions: number; reacted: boolean }>
  deleteMyPost(board: BoardId, postId: string): Promise<void>
  /** 다시 글을 올릴 수 있을 때까지 남은 시간(ms), 0 이면 바로 가능 */
  getCooldownRemaining(): Promise<number>
}

// ---------- 시드 + localStorage 구현 ----------

type StoredPost = { id: string; text: string; reason?: string; color?: MemoColor; author: string; createdAt: number }

function createLocalBoardService(): BoardService {
  const PREFIX = 'board:'
  const keyPosts = (b: BoardId) => `${PREFIX}posts:${b}`
  const KEY_REACTED = `${PREFIX}reacted`
  const KEY_DELETED = `${PREFIX}deleted`
  const KEY_LAST = `${PREFIX}lastPostAt`

  if (RESET_REQUESTED) storageRemovePrefix(PREFIX)

  // 시드 글은 앱이 켜질 때 시각 기준으로 "몇 시간 전" 글이 됨
  const bootAt = Date.now()
  const seeds: Record<BoardId, (StoredPost & { base: number })[]> = {
    memo: [],
    fridge: [],
    chalk: [],
  }
  ;(Object.keys(SEED_POSTS) as BoardId[]).forEach((b) => {
    seeds[b] = SEED_POSTS[b].map((s, i) => ({
      id: `seed-${b}-${i}`,
      text: s.text,
      reason: s.reason,
      color: s.color,
      author: s.author,
      createdAt: bootAt - s.hoursAgo * 3600_000,
      base: s.reactions,
    }))
  })

  const readJson = <T,>(key: string, fallback: T): T => {
    try {
      const v = JSON.parse(storageGet(key) || 'null')
      return v ?? fallback
    } catch {
      return fallback
    }
  }
  const myPosts = (b: BoardId): StoredPost[] => {
    const v = readJson<StoredPost[]>(keyPosts(b), [])
    return Array.isArray(v) ? v : []
  }
  const reacted = () => new Set(readJson<string[]>(KEY_REACTED, []))
  const saveReacted = (s: Set<string>) => storageSet(KEY_REACTED, JSON.stringify([...s]))

  // 서버처럼 살짝 기다렸다가 응답 (로딩 표시 확인용)
  const delay = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms))

  const all = (b: BoardId): Post[] => {
    const r = reacted()
    const fromSeed = seeds[b].map(({ base, ...s }) => ({
      ...s,
      board: b,
      reactions: base + (r.has(s.id) ? 1 : 0),
      reacted: r.has(s.id),
      mine: false,
    }))
    const mine = myPosts(b).map((s) => ({ ...s, board: b, reactions: r.has(s.id) ? 1 : 0, reacted: r.has(s.id), mine: true }))
    return [...mine, ...fromSeed]
  }

  const cooldownLeft = () => {
    const last = Number(storageGet(KEY_LAST)) || 0
    return Math.max(0, last + POST_COOLDOWN_MS - Date.now())
  }

  return {
    async getPosts(board, sort) {
      const list = all(board)
      list.sort((a, b) => (sort === 'popular' ? b.reactions - a.reactions || b.createdAt - a.createdAt : b.createdAt - a.createdAt))
      return delay(list)
    },

    async addPost(board, input) {
      const left = cooldownLeft()
      if (left > 0) throw new BoardError('cooldown', '잠시 후에 다시 남겨 주세요', left)
      const main = checkText(input.text, POST_MAX)
      if (!main.ok) throw new BoardError('invalid', main.reason)
      let reason: string | undefined
      if (board === 'fridge') {
        const r = checkText(input.reason ?? '', REASON_MAX)
        if (!r.ok) throw new BoardError('invalid', r.reason === '내용을 적어 주세요' ? '추천 이유를 한 줄 적어 주세요' : r.reason)
        reason = r.text
      }
      const post: StoredPost = {
        id: `my-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        text: main.text,
        reason,
        color: board === 'memo' ? input.color ?? 'yellow' : undefined,
        author: input.author.trim() || ANONYMOUS,
        createdAt: Date.now(),
      }
      storageSet(keyPosts(board), JSON.stringify([post, ...myPosts(board)]))
      storageSet(KEY_LAST, String(post.createdAt))
      return delay({ ...post, board, reactions: 0, reacted: false, mine: true })
    },

    async toggleReaction(board, postId) {
      const target = all(board).find((p) => p.id === postId)
      if (!target) throw new BoardError('not-found', '글을 찾을 수 없어요')
      const r = reacted()
      if (r.has(postId)) r.delete(postId)
      else r.add(postId)
      saveReacted(r)
      const updated = all(board).find((p) => p.id === postId)!
      return delay({ reactions: updated.reactions, reacted: updated.reacted }, 80)
    },

    async deleteMyPost(board, postId) {
      const list = myPosts(board)
      if (!list.some((p) => p.id === postId)) throw new BoardError('not-found', '내가 쓴 글만 지울 수 있어요')
      storageSet(keyPosts(board), JSON.stringify(list.filter((p) => p.id !== postId)))
      const r = reacted()
      if (r.delete(postId)) saveReacted(r)
      // 서버 구현에서 쓸 수 있도록 지운 글 기록만 남겨 둠
      const del = readJson<string[]>(KEY_DELETED, [])
      storageSet(KEY_DELETED, JSON.stringify([...del, postId].slice(-50)))
      return delay(undefined, 120)
    },

    async getCooldownRemaining() {
      return cooldownLeft()
    },
  }
}

/** 앱 전체가 쓰는 게시판 서비스. Firebase 로 바꿀 때는 이 줄만 교체 */
export const boardService: BoardService = createLocalBoardService()
