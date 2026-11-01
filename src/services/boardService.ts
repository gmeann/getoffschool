/**
 * 연구실 게시판 데이터 서비스 (메모보드·냉장고·칠판).
 *
 * UI 는 이 파일의 `boardService` 만 사용합니다. localStorage·Firestore 를 직접 다루지 않아요.
 * - Firestore 구현: posts 컬렉션 (+ reactions/reports 하위 문서). 시드 글은 DB 에 넣지 않고 화면에서 합침
 * - 로컬 구현: 시드 글 + localStorage. ?offline=1, 설정 없음, 서버 실패·한도 초과 때 자동으로 이쪽을 씀
 * 모든 함수는 Promise 를 돌려줘서 어느 구현이든 UI 코드는 같아요.
 */
import { ANONYMOUS, POST_MAX, REASON_MAX, SEED_POSTS, type BoardId, type MemoColor } from '../data/boards'
import { RESET_REQUESTED, storageGet, storageRemovePrefix, storageSet } from '../hooks/clock'
import { checkText } from './moderation'
import { cooldownLeft, markWrote } from './writeGate'
import { canTryServer, getFirebase, isPermissionError, markOffline, markOnline, withTimeout, type Fb } from './firebase'

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
  /** 시드 글 (신고·삭제 대상 아님) */
  seed: boolean
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
  /** 신고 (한 사람이 한 글에 1회). 신고한 글은 내 목록에서 바로 빠짐 */
  reportPost(board: BoardId, postId: string): Promise<void>
  /** 다시 글을 올릴 수 있을 때까지 남은 시간(ms), 0 이면 바로 가능 */
  getCooldownRemaining(): Promise<number>
}

/** 한 게시판에 보여 줄 최대 글 수 (진짜 글 + 시드). 진짜 글이 많아지면 시드는 뒤로 밀려 사라짐 */
const SHOW_MAX = 30
const PREFIX = 'board:'
const KEY_REPORTED = `${PREFIX}reported`

if (RESET_REQUESTED) storageRemovePrefix(PREFIX)

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(storageGet(key) || 'null')
    return v ?? fallback
  } catch {
    return fallback
  }
}
const readSet = (key: string) => new Set(readJson<string[]>(key, []))
const saveSet = (key: string, s: Set<string>) => storageSet(key, JSON.stringify([...s].slice(-300)))

const sortPosts = (list: Post[], sort: SortMode) =>
  list.sort((a, b) => (sort === 'popular' ? b.reactions - a.reactions || b.createdAt - a.createdAt : b.createdAt - a.createdAt))

function validate(board: BoardId, input: NewPost) {
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
  const author = (input.author.trim() || ANONYMOUS).slice(0, 20)
  return { text: main.text, reason, author, color: board === 'memo' ? input.color ?? 'yellow' : undefined }
}

// ---------- 시드 글 (코드 안, 앱이 켜진 시각 기준 "몇 시간 전") ----------
const bootAt = Date.now()
type SeedRow = { id: string; text: string; reason?: string; color?: MemoColor; author: string; createdAt: number; base: number }
const SEEDS: Record<BoardId, SeedRow[]> = { memo: [], fridge: [], chalk: [] }
;(Object.keys(SEED_POSTS) as BoardId[]).forEach((b) => {
  SEEDS[b] = SEED_POSTS[b].map((s, i) => ({
    id: `seed-${b}-${i}`,
    text: s.text,
    reason: s.reason,
    color: s.color,
    author: s.author,
    createdAt: bootAt - s.hoursAgo * 3600_000,
    base: s.reactions,
  }))
})
// 시드 글 반응은 서버에 올리지 않고 이 기기에만 저장
const KEY_SEED_REACTED = `${PREFIX}reacted`
function seedPosts(b: BoardId): Post[] {
  const r = readSet(KEY_SEED_REACTED)
  return SEEDS[b].map(({ base, ...s }) => ({ ...s, board: b, reactions: base + (r.has(s.id) ? 1 : 0), reacted: r.has(s.id), mine: false, seed: true }))
}
function toggleSeedReaction(postId: string) {
  const r = readSet(KEY_SEED_REACTED)
  if (r.has(postId)) r.delete(postId)
  else r.add(postId)
  saveSet(KEY_SEED_REACTED, r)
}

const delay = <T,>(v: T, ms = 200) => new Promise<T>((r) => setTimeout(() => r(v), ms))

// ---------- 로컬 구현 (시드 + localStorage) ----------
type StoredPost = { id: string; text: string; reason?: string; color?: MemoColor; author: string; createdAt: number }

export function createLocalBoardService(): BoardService {
  const keyPosts = (b: BoardId) => `${PREFIX}posts:${b}`
  const myPosts = (b: BoardId): StoredPost[] => {
    const v = readJson<StoredPost[]>(keyPosts(b), [])
    return Array.isArray(v) ? v : []
  }
  const all = (b: BoardId): Post[] => {
    const r = readSet(KEY_SEED_REACTED)
    const reported = readSet(KEY_REPORTED)
    const mine = myPosts(b).map((s) => ({ ...s, board: b, reactions: r.has(s.id) ? 1 : 0, reacted: r.has(s.id), mine: true, seed: false }))
    return [...mine, ...seedPosts(b)].filter((p) => !reported.has(p.id))
  }
  return {
    async getPosts(board, sort) {
      return delay(sortPosts(all(board), sort).slice(0, SHOW_MAX + myPosts(board).length))
    },
    async addPost(board, input) {
      const v = validate(board, input)
      const post: StoredPost = { id: `my-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, ...v, createdAt: Date.now() }
      storageSet(keyPosts(board), JSON.stringify([post, ...myPosts(board)]))
      markWrote()
      return delay({ ...post, board, reactions: 0, reacted: false, mine: true, seed: false })
    },
    async toggleReaction(board, postId) {
      if (!all(board).some((p) => p.id === postId)) throw new BoardError('not-found', '글을 찾을 수 없어요')
      toggleSeedReaction(postId)
      const p = all(board).find((x) => x.id === postId)!
      return delay({ reactions: p.reactions, reacted: p.reacted }, 60)
    },
    async deleteMyPost(board, postId) {
      const list = myPosts(board)
      if (!list.some((p) => p.id === postId)) throw new BoardError('not-found', '내가 쓴 글만 지울 수 있어요')
      storageSet(keyPosts(board), JSON.stringify(list.filter((p) => p.id !== postId)))
      return delay(undefined, 100)
    },
    async reportPost(_board, postId) {
      if (postId.startsWith('seed-')) throw new BoardError('invalid', '기본 글은 신고할 수 없어요')
      const s = readSet(KEY_REPORTED)
      s.add(postId)
      saveSet(KEY_REPORTED, s)
      return delay(undefined, 100)
    },
    async getCooldownRemaining() {
      return cooldownLeft()
    },
  }
}

// ---------- Firestore 구현 ----------
const BOARD_DB: Record<BoardId, string> = { memo: 'memo', fridge: 'fridge', chalk: 'blackboard' }
const KEY_REMOTE_REACTED = `${PREFIX}remoteReacted`
/** 같은 게시판·정렬을 1분 안에 다시 열면 서버를 다시 읽지 않음 (읽기 절약) */
const CACHE_MS = 60_000

type RemoteRow = Post & { reportCount: number }

function createFirestoreBoardService(fb: Fb): BoardService {
  const { db, uid, fs } = fb
  const cache = new Map<string, { at: number; rows: RemoteRow[] }>()
  const rowsById = new Map<string, RemoteRow>()
  const reacted = () => readSet(KEY_REMOTE_REACTED)

  const merge = (board: BoardId, sort: SortMode, rows: RemoteRow[]) => {
    const reported = readSet(KEY_REPORTED)
    const r = reacted()
    const remote = rows.filter((p) => !reported.has(p.id)).map((p) => ({ ...p, reacted: r.has(p.id) }))
    return sortPosts([...remote, ...seedPosts(board)], sort).slice(0, SHOW_MAX)
  }
  const invalidate = (board: BoardId) => {
    cache.delete(`${board}|latest`)
    cache.delete(`${board}|popular`)
  }

  return {
    async getPosts(board, sort) {
      const key = `${board}|${sort}`
      const hit = cache.get(key)
      if (hit && Date.now() - hit.at < CACHE_MS) return merge(board, sort, hit.rows)
      const base = [fs.where('board', '==', BOARD_DB[board]), fs.where('hidden', '==', false)]
      const order =
        sort === 'latest'
          ? [fs.orderBy('createdAt', 'desc')]
          : [fs.orderBy('reactionCount', 'desc'), fs.orderBy('createdAt', 'desc')]
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'posts'), ...base, ...order, fs.limit(SHOW_MAX)))
      const rows: RemoteRow[] = snap.docs.map((d) => {
        const x = d.data()
        const row: RemoteRow = {
          id: d.id,
          board,
          text: String(x.text ?? ''),
          reason: x.reason,
          color: x.color,
          author: String(x.nick ?? ANONYMOUS),
          createdAt: x.createdAt?.toMillis?.() ?? Date.now(),
          reactions: Number(x.reactionCount) || 0,
          reportCount: Number(x.reportCount) || 0,
          reacted: false,
          mine: x.uid === uid,
          seed: false,
        }
        rowsById.set(d.id, row)
        return row
      })
      cache.set(key, { at: Date.now(), rows })
      return merge(board, sort, rows)
    },

    async addPost(board, input) {
      const v = validate(board, input)
      const ref = fs.doc(fs.collection(db, 'posts'))
      const data: Record<string, unknown> = {
        board: BOARD_DB[board],
        text: v.text,
        nick: v.author,
        uid,
        createdAt: fs.serverTimestamp(),
        reactionCount: 0,
        reportCount: 0,
        hidden: false,
      }
      if (v.color) data.color = v.color
      if (v.reason) data.reason = v.reason
      const batch = fs.writeBatch(db)
      batch.set(ref, data)
      batch.set(fs.doc(db, 'users', uid), { lastWriteAt: fs.serverTimestamp() })
      await batch.commit()
      markWrote()
      const row: RemoteRow = { id: ref.id, board, text: v.text, reason: v.reason, color: v.color, author: v.author, createdAt: Date.now(), reactions: 0, reportCount: 0, reacted: false, mine: true, seed: false }
      rowsById.set(ref.id, row)
      // 방금 쓴 글이 목록에 바로 보이도록 캐시에 넣어 둠 (낙관적 업데이트)
      for (const s of ['latest', 'popular'] as const) {
        const c = cache.get(`${board}|${s}`)
        if (c) c.rows = [row, ...c.rows]
      }
      return row
    },

    async toggleReaction(board, postId) {
      if (postId.startsWith('seed-')) {
        toggleSeedReaction(postId)
        const p = seedPosts(board).find((x) => x.id === postId)!
        return { reactions: p.reactions, reacted: p.reacted }
      }
      const row = rowsById.get(postId)
      const r = reacted()
      const was = r.has(postId)
      const batch = fs.writeBatch(db)
      const reactionRef = fs.doc(db, 'posts', postId, 'reactions', uid)
      if (was) batch.delete(reactionRef)
      else batch.set(reactionRef, { createdAt: fs.serverTimestamp() })
      batch.update(fs.doc(db, 'posts', postId), { reactionCount: fs.increment(was ? -1 : 1) })
      try {
        await batch.commit()
      } catch (e) {
        // 다른 기기에서 이미 눌렀던 경우 등: 서버 상태에 맞춰 내 기록만 고침
        if (!isPermissionError(e)) throw e
        if (was) r.delete(postId)
        else r.add(postId)
        saveSet(KEY_REMOTE_REACTED, r)
        return { reactions: row?.reactions ?? 0, reacted: !was }
      }
      if (was) r.delete(postId)
      else r.add(postId)
      saveSet(KEY_REMOTE_REACTED, r)
      if (row) row.reactions += was ? -1 : 1
      return { reactions: row?.reactions ?? (was ? 0 : 1), reacted: !was }
    },

    async deleteMyPost(board, postId) {
      await fs.deleteDoc(fs.doc(db, 'posts', postId))
      rowsById.delete(postId)
      invalidate(board)
    },

    async reportPost(board, postId) {
      if (postId.startsWith('seed-')) throw new BoardError('invalid', '기본 글은 신고할 수 없어요')
      const reported = readSet(KEY_REPORTED)
      if (reported.has(postId)) return
      const send = async (currentCount: number) => {
        const next = currentCount + 1
        const batch = fs.writeBatch(db)
        batch.set(fs.doc(db, 'posts', postId, 'reports', uid), { createdAt: fs.serverTimestamp() })
        batch.update(fs.doc(db, 'posts', postId), { reportCount: fs.increment(1), hidden: next >= 3 })
        await batch.commit()
      }
      try {
        await send(rowsById.get(postId)?.reportCount ?? 0)
      } catch (e) {
        if (!isPermissionError(e)) throw e
        // 그 사이 다른 사람이 신고해서 숫자가 달라졌을 수 있음 → 최신 값으로 한 번 더
        const snap = await fs.getDoc(fs.doc(db, 'posts', postId))
        if (snap.exists()) {
          try {
            await send(Number(snap.data().reportCount) || 0)
          } catch (e2) {
            if (!isPermissionError(e2)) throw e2 // 이미 신고한 글이면 조용히 넘어감
          }
        }
      }
      reported.add(postId)
      saveSet(KEY_REPORTED, reported)
      invalidate(board)
    },

    async getCooldownRemaining() {
      return cooldownLeft()
    },
  }
}

// ---------- 서버가 되면 Firestore, 안 되면 로컬 ----------
function createHybridBoardService(): BoardService {
  const local = createLocalBoardService()
  let remote: BoardService | null = null
  const pick = async () => {
    const fb = await getFirebase()
    if (!fb || !canTryServer()) return null
    remote ??= createFirestoreBoardService(fb)
    return remote
  }
  /** 서버 호출: 규칙에 막히면 안내, 서버 장애·한도 초과면 혼자 보는 모드로 바꾸고 로컬로 */
  async function call<T>(fn: (s: BoardService) => Promise<T>, onRuleDenied?: () => never): Promise<T> {
    const r = await pick()
    if (!r) return fn(local)
    try {
      const v = await withTimeout(fn(r))
      markOnline()
      return v
    } catch (e) {
      if (e instanceof BoardError) throw e
      if (isPermissionError(e)) {
        if (onRuleDenied) onRuleDenied()
        throw new BoardError('invalid', '지금은 처리할 수 없어요. 잠시 후 다시 해 주세요')
      }
      markOffline(e)
      return fn(local)
    }
  }
  return {
    getPosts: (b, s) => call((x) => x.getPosts(b, s)),
    addPost: (b, p) =>
      call(
        (x) => x.addPost(b, p),
        () => {
          // 서버의 30초 도배 방지에 걸림
          throw new BoardError('cooldown', '잠시 후에 다시 남겨 주세요', 30_000)
        },
      ),
    toggleReaction: (b, id) => call((x) => x.toggleReaction(b, id)),
    deleteMyPost: (b, id) => call((x) => x.deleteMyPost(b, id)),
    reportPost: (b, id) => call((x) => x.reportPost(b, id)),
    getCooldownRemaining: async () => cooldownLeft(),
  }
}

/** 앱 전체가 쓰는 게시판 서비스 */
export const boardService: BoardService = createHybridBoardService()
