/**
 * 관리자 모드 (주소에 ?admin=1 을 붙였을 때만 설정 창에 보임).
 * - Google 계정으로 로그인 → Firestore 의 admins/{uid} 문서가 있으면 관리자
 * - admins 문서는 Firebase 콘솔에서만 만들 수 있음 (앱에서는 규칙으로 막음)
 * - 할 수 있는 일: 신고·숨김 글 보기, 되살리기, 삭제, 오늘 통계
 */
import { todayKey } from '../hooks/clock'
import { getFirebase } from './firebase'

export const ADMIN_FLAG =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1'

export type AdminState =
  | { kind: 'offline' }
  | { kind: 'signed-out' }
  | { kind: 'not-admin'; uid: string; email: string | null }
  | { kind: 'admin'; uid: string; email: string | null }

export type ReportedItem = {
  kind: 'post' | 'heart'
  id: string
  board?: string
  text: string
  nick: string
  createdAt: number
  reportCount: number
  hidden: boolean
}

export type AdminStats = {
  visitors: number
  flung: number
  laps: number
  postsToday: number
  heartsToday: number
  reported: number
}

const BOARD_NAME: Record<string, string> = { memo: '메모보드', fridge: '냉장고', blackboard: '칠판' }
export const boardLabel = (b?: string) => (b ? BOARD_NAME[b] ?? b : '마음 나누기')

export const adminService = {
  async state(): Promise<AdminState> {
    const fb = await getFirebase()
    if (!fb) return { kind: 'offline' }
    const user = fb.auth.currentUser
    if (!user || user.isAnonymous) return { kind: 'signed-out' }
    try {
      const snap = await fb.fs.getDoc(fb.fs.doc(fb.db, 'admins', user.uid))
      return snap.exists() ? { kind: 'admin', uid: user.uid, email: user.email } : { kind: 'not-admin', uid: user.uid, email: user.email }
    } catch {
      return { kind: 'not-admin', uid: user.uid, email: user.email }
    }
  },

  /** Google 로그인 후 새로고침 (모든 서비스가 새 계정으로 다시 연결되도록) */
  async signIn(): Promise<void> {
    const fb = await getFirebase()
    if (!fb) throw new Error('지금은 서버에 연결할 수 없어요')
    const { authMod, auth } = fb
    await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider())
    window.location.reload()
  },

  /** 로그아웃 → 새로고침하면 다시 익명 사용자 */
  async signOut(): Promise<void> {
    const fb = await getFirebase()
    if (fb) await fb.authMod.signOut(fb.auth)
    window.location.reload()
  },

  /** 신고된 글·마음 (숨김 포함), 신고 많은 순 */
  async reported(): Promise<ReportedItem[]> {
    const fb = await getFirebase()
    if (!fb) return []
    const { db, fs } = fb
    const q = (col: string) => fs.query(fs.collection(db, col), fs.where('reportCount', '>', 0), fs.orderBy('reportCount', 'desc'), fs.limit(50))
    const [posts, hearts] = await Promise.all([fs.getDocs(q('posts')), fs.getDocs(q('hearts'))])
    const map = (kind: 'post' | 'heart') => (d: { id: string; data: () => Record<string, unknown> }): ReportedItem => {
      const x = d.data() as Record<string, any>
      return {
        kind,
        id: d.id,
        board: kind === 'post' ? String(x.board) : undefined,
        text: String(x.text ?? ''),
        nick: String(x.nick ?? ''),
        createdAt: x.createdAt?.toMillis?.() ?? 0,
        reportCount: Number(x.reportCount) || 0,
        hidden: Boolean(x.hidden),
      }
    }
    return [...posts.docs.map(map('post')), ...hearts.docs.map(map('heart'))].sort((a, b) => b.reportCount - a.reportCount)
  },

  /** 되살리기: 숨김 해제 + 신고 수 0 */
  async restore(item: ReportedItem): Promise<void> {
    const fb = await getFirebase()
    if (!fb) throw new Error('offline')
    await fb.fs.updateDoc(fb.fs.doc(fb.db, item.kind === 'post' ? 'posts' : 'hearts', item.id), { hidden: false, reportCount: 0 })
  },

  async remove(item: ReportedItem): Promise<void> {
    const fb = await getFirebase()
    if (!fb) throw new Error('offline')
    await fb.fs.deleteDoc(fb.fs.doc(fb.db, item.kind === 'post' ? 'posts' : 'hearts', item.id))
  },

  async stats(): Promise<AdminStats> {
    const fb = await getFirebase()
    if (!fb) throw new Error('offline')
    const { db, fs } = fb
    const start = new Date(todayKey() + 'T00:00:00')
    const since = fs.Timestamp.fromDate(start)
    const count = async (col: string, ...cs: ReturnType<typeof fs.where>[]) =>
      (await fs.getCountFromServer(fs.query(fs.collection(db, col), ...cs))).data().count
    const [daily, postsToday, heartsToday, rp, rh] = await Promise.all([
      fs.getDoc(fs.doc(db, 'daily', todayKey())),
      count('posts', fs.where('createdAt', '>=', since)),
      count('hearts', fs.where('createdAt', '>=', since)),
      count('posts', fs.where('reportCount', '>', 0)),
      count('hearts', fs.where('reportCount', '>', 0)),
    ])
    const d = (daily.exists() ? daily.data() : {}) as Record<string, number>
    return {
      visitors: Number(d.visitors) || 0,
      flung: Number(d.flung) || 0,
      laps: Number(d.laps) || 0,
      postsToday,
      heartsToday,
      reported: rp + rh,
    }
  },
}
