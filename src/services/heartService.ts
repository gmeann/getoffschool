/**
 * 마음 나누기 서비스 (하늘의 구름).
 * "다른 선생님께 익명으로 나누기"를 켰을 때만 여기로 글이 옵니다. 혼자 띄우기는 이 모듈을 거치지 않아요.
 * Firestore: hearts 컬렉션 (+ reactions/reports). 실패하면 시드 구름만 보여 주는 혼자 보는 모드.
 */
import { HEART_MAX, SEED_HEARTS, SKY_HEARTS_MAX, type HeartKind } from '../data/hearts'
import { ANONYMOUS } from '../data/boards'
import { RESET_REQUESTED, storageGet, storageRemovePrefix, storageSet } from '../hooks/clock'
import { checkText } from './moderation'
import { cooldownLeft, markWrote } from './writeGate'
import { canTryServer, getFirebase, isPermissionError, markOffline, markOnline, withTimeout } from './firebase'

export type Heart = {
  id: string
  text: string
  nick: string
  createdAt: number
  counts: Record<HeartKind, number>
  /** 내가 누른 반응 (한 글에 하나) */
  myReaction: HeartKind | null
  mine: boolean
  seed: boolean
}

export class HeartError extends Error {
  code: 'invalid' | 'cooldown' | 'offline'
  constructor(code: HeartError['code'], message: string) {
    super(message)
    this.code = code
  }
}

const PREFIX = 'heart:'
const KEY_MY_REACTIONS = `${PREFIX}myReactions`
const KEY_REPORTED = `${PREFIX}reported`
if (RESET_REQUESTED) storageRemovePrefix(PREFIX)

const readMap = (): Record<string, HeartKind> => {
  try {
    return JSON.parse(storageGet(KEY_MY_REACTIONS) || '{}') ?? {}
  } catch {
    return {}
  }
}
const saveMap = (m: Record<string, HeartKind>) => storageSet(KEY_MY_REACTIONS, JSON.stringify(m))
const readReported = () => {
  try {
    return new Set<string>(JSON.parse(storageGet(KEY_REPORTED) || '[]'))
  } catch {
    return new Set<string>()
  }
}

const bootAt = Date.now()
function seeds(): Heart[] {
  const m = readMap()
  return SEED_HEARTS.map((s, i) => {
    const id = `seed-heart-${i}`
    const my = m[id] ?? null
    const counts = { pat: s.pat, thanks: s.thanks, together: s.together }
    if (my) counts[my] += 1
    return { id, text: s.text, nick: s.nick, createdAt: bootAt - s.hoursAgo * 3600_000, counts, myReaction: my, mine: false, seed: true }
  })
}

/** 진짜 글이 적으면 시드로 채워서 최대 개수까지 */
function withSeeds(real: Heart[]): Heart[] {
  const reported = readReported()
  const list = real.filter((h) => !reported.has(h.id))
  const fill = seeds().slice(0, Math.max(0, Math.min(SEED_HEARTS.length, SKY_HEARTS_MAX - list.length)))
  return [...list, ...fill].slice(0, SKY_HEARTS_MAX)
}

export const heartService = {
  /** 하늘 구름 목록 (장면에 들어갈 때 한 번) */
  async getHearts(): Promise<Heart[]> {
    const fb = await getFirebase()
    if (!fb || !canTryServer()) return withSeeds([])
    try {
      const { db, uid, fs } = fb
      const snap = await withTimeout(
        fs.getDocs(fs.query(fs.collection(db, 'hearts'), fs.where('hidden', '==', false), fs.orderBy('createdAt', 'desc'), fs.limit(SKY_HEARTS_MAX))),
      )
      markOnline()
      const m = readMap()
      return withSeeds(
        snap.docs.map((d) => {
          const x = d.data()
          return {
            id: d.id,
            text: String(x.text ?? ''),
            nick: String(x.nick ?? ANONYMOUS),
            createdAt: x.createdAt?.toMillis?.() ?? Date.now(),
            counts: { pat: Number(x.pat) || 0, thanks: Number(x.thanks) || 0, together: Number(x.together) || 0 },
            myReaction: m[d.id] ?? null,
            mine: x.uid === uid,
            seed: false,
          }
        }),
      )
    } catch (e) {
      markOffline(e)
      return withSeeds([])
    }
  },

  /**
   * 나누기. 막히면 HeartError (혼자 띄우기는 그대로 가능).
   * 위기 신호·금지어·개인정보 검사는 부르는 쪽(App)과 여기서 모두 함.
   */
  async addHeart(rawText: string, nick: string): Promise<Heart> {
    if (cooldownLeft() > 0) throw new HeartError('cooldown', '잠시 후에 다시 나눠 주세요')
    const c = checkText(rawText, HEART_MAX)
    if (!c.ok) throw new HeartError('invalid', c.reason)
    const fb = await getFirebase()
    if (!fb || !canTryServer()) throw new HeartError('offline', '지금은 혼자 보는 모드라 나눌 수 없어요')
    const { db, uid, fs } = fb
    const ref = fs.doc(fs.collection(db, 'hearts'))
    const name = (nick.trim() || ANONYMOUS).slice(0, 20)
    const batch = fs.writeBatch(db)
    batch.set(ref, { text: c.text, nick: name, uid, createdAt: fs.serverTimestamp(), pat: 0, thanks: 0, together: 0, reportCount: 0, hidden: false })
    batch.set(fs.doc(db, 'users', uid), { lastWriteAt: fs.serverTimestamp() })
    try {
      await withTimeout(batch.commit())
    } catch (e) {
      if (isPermissionError(e)) throw new HeartError('cooldown', '잠시 후에 다시 나눠 주세요')
      markOffline(e)
      throw new HeartError('offline', '지금은 나눌 수 없어요')
    }
    markOnline()
    markWrote()
    return { id: ref.id, text: c.text, nick: name, createdAt: Date.now(), counts: { pat: 0, thanks: 0, together: 0 }, myReaction: null, mine: true, seed: false }
  },

  /** 반응: 한 글에 하나. 같은 걸 누르면 취소, 다른 걸 누르면 바꿈 */
  async toggleReaction(h: Heart, kind: HeartKind): Promise<Heart> {
    const m = readMap()
    const prev = m[h.id] ?? null
    const next: HeartKind | null = prev === kind ? null : kind
    const counts = { ...h.counts }
    if (prev) counts[prev] = Math.max(0, counts[prev] - 1)
    if (next) counts[next] += 1
    if (!h.seed) {
      const fb = await getFirebase()
      if (!fb || !canTryServer()) throw new HeartError('offline', '지금은 혼자 보는 모드예요')
      const { db, uid, fs } = fb
      const heartRef = fs.doc(db, 'hearts', h.id)
      const reactionRef = fs.doc(db, 'hearts', h.id, 'reactions', uid)
      try {
        if (prev) {
          const b = fs.writeBatch(db)
          b.delete(reactionRef)
          b.update(heartRef, { [prev]: fs.increment(-1) })
          await withTimeout(b.commit())
        }
        if (next) {
          const b = fs.writeBatch(db)
          b.set(reactionRef, { kind: next, createdAt: fs.serverTimestamp() })
          b.update(heartRef, { [next]: fs.increment(1) })
          await withTimeout(b.commit())
        }
      } catch (e) {
        if (!isPermissionError(e)) markOffline(e)
        throw new HeartError('offline', '반응을 남기지 못했어요')
      }
    }
    if (next) m[h.id] = next
    else delete m[h.id]
    saveMap(m)
    return { ...h, counts, myReaction: next }
  },

  async report(h: Heart): Promise<void> {
    if (h.seed) throw new HeartError('invalid', '기본 구름은 신고할 수 없어요')
    const reported = readReported()
    if (!reported.has(h.id)) {
      const fb = await getFirebase()
      if (fb && canTryServer()) {
        const { db, uid, fs } = fb
        const send = async (count: number) => {
          const b = fs.writeBatch(db)
          b.set(fs.doc(db, 'hearts', h.id, 'reports', uid), { createdAt: fs.serverTimestamp() })
          b.update(fs.doc(db, 'hearts', h.id), { reportCount: fs.increment(1), hidden: count + 1 >= 3 })
          await withTimeout(b.commit())
        }
        try {
          const snap = await withTimeout(fs.getDoc(fs.doc(db, 'hearts', h.id)))
          if (snap.exists()) await send(Number(snap.data().reportCount) || 0)
        } catch (e) {
          if (!isPermissionError(e)) markOffline(e)
        }
      }
      reported.add(h.id)
      storageSet(KEY_REPORTED, JSON.stringify([...reported].slice(-300)))
    }
  },

  async deleteMine(h: Heart): Promise<void> {
    if (!h.mine) throw new HeartError('invalid', '내가 나눈 글만 지울 수 있어요')
    const fb = await getFirebase()
    if (!fb || !canTryServer()) throw new HeartError('offline', '지금은 지울 수 없어요')
    try {
      await withTimeout(fb.fs.deleteDoc(fb.fs.doc(fb.db, 'hearts', h.id)))
    } catch (e) {
      if (!isPermissionError(e)) markOffline(e)
      throw new HeartError('offline', '지우지 못했어요')
    }
  },

  cooldownLeft,
}
