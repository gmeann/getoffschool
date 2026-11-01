/**
 * 공유 카운터 서비스: 오늘 날린 업무 합계·누적, 오늘 다녀간 선생님 수, 오늘 돈 운동장 바퀴 합계.
 *
 * 화면은 이 인터페이스만 사용합니다.
 * - Firestore: daily/{YYYY-MM-DD} = { flung, laps, visitors }, counters/total = { flung },
 *              visits/{YYYY-MM-DD}/users/{uid} (사용자당 하루 1회 방문 기록)
 * - 비용 절약: 쓰기는 로컬에 모았다가 10초마다(또는 장면을 나갈 때) 한 번에 increment,
 *              읽기는 장면에 들어갈 때 한 번(refresh). 실시간 구독(onSnapshot)은 쓰지 않음
 * - 실패하면 내 기기 값(로컬)으로 보여 주고 다음에 다시 보냄
 */
import { RESET_REQUESTED, storageGet, storageRemove, storageRemovePrefix, storageSet, todayKey } from '../hooks/clock'
import { canTryServer, getFirebase, isOnline, isPermissionError, markOffline, markOnline, subscribeNetStatus, withTimeout } from './firebase'

export type CounterSnapshot = {
  /** 오늘 날린 업무 (공유면 모두의 합계, 아니면 내 값) */
  today: number
  /** 누적 날린 업무 */
  total: number
  /** 오늘 다녀간 선생님 수 */
  visitors: number
  /** 오늘 선생님들이 돈 운동장 바퀴 합계 */
  lapsToday: number
  /** 서버 공유 값인지 */
  shared: boolean
}

export interface CounterService {
  getToday(): number
  getTotal(): number
  getSnapshot(): CounterSnapshot
  /** 업무 한 장 날림 (로컬에 모아 둠) */
  addOne(): Promise<CounterSnapshot>
  /** 운동장 한 바퀴 완주 (로컬에 모아 둠) */
  addLaps(n: number): void
  /** 서버 값 다시 읽기 (장면에 들어갈 때) */
  refresh(): Promise<void>
  /** 모아 둔 증가분 보내기 */
  flush(): Promise<void>
  subscribe(listener: () => void): () => void
  /** 앱 시작 때 한 번: 오늘 방문 기록 + 10초 주기 전송 시작 */
  start(): void
  reset(): void
}

const MAX_STEP = 50 // 규칙: 한 번에 최대 50까지만 증가

function createCounterService(): CounterService {
  const listeners = new Set<() => void>()
  // 내 기기 값 (공유가 안 될 때 보여 줌)
  const keyMine = () => `flung:${todayKey()}`
  const KEY_MINE_TOTAL = 'flungTotal'
  const keyPending = 'counter:pending'
  const keyVisited = () => `counter:visited:${todayKey()}`

  if (RESET_REQUESTED) {
    storageRemovePrefix('flung:')
    storageRemove(KEY_MINE_TOTAL)
    storageRemove(keyPending)
    storageRemovePrefix('counter:visited:')
  }

  type Pending = { date: string; flung: number; laps: number }
  const readPending = (): Pending => {
    try {
      const p = JSON.parse(storageGet(keyPending) || 'null')
      if (p && p.date === todayKey()) return { date: p.date, flung: Number(p.flung) || 0, laps: Number(p.laps) || 0 }
      // 어제 못 보낸 값은 버리지 않고 오늘 누적에는 넣지 않음 (단순화를 위해 버림)
    } catch {
      /* 무시 */
    }
    return { date: todayKey(), flung: 0, laps: 0 }
  }
  let pending = readPending()
  const savePending = () => storageSet(keyPending, JSON.stringify(pending))

  let server: { date: string; flung: number; laps: number; visitors: number; total: number } | null = null
  let mineLaps = 0 // 이번 접속에서 내가 돈 바퀴 (공유 실패 때 표시용)

  const local = () => ({ today: Number(storageGet(keyMine())) || 0, total: Number(storageGet(KEY_MINE_TOTAL)) || 0 })

  const compute = (): CounterSnapshot => {
    if (server && server.date === todayKey() && isOnline()) {
      return {
        today: server.flung + pending.flung,
        total: server.total + pending.flung,
        visitors: Math.max(1, server.visitors),
        lapsToday: server.laps + pending.laps,
        shared: true,
      }
    }
    const l = local()
    return { today: l.today, total: l.total, visitors: 1, lapsToday: mineLaps, shared: false }
  }
  let snap = compute()
  const emit = () => {
    const n = compute()
    if (n.today !== snap.today || n.total !== snap.total || n.visitors !== snap.visitors || n.lapsToday !== snap.lapsToday || n.shared !== snap.shared) {
      snap = n
      listeners.forEach((l) => l())
    }
  }

  // 연결 상태가 바뀌면 (공유 ↔ 내 값) 표시도 바꿈
  subscribeNetStatus(() => emit())

  let flushing = false
  const service: CounterService = {
    getToday: () => snap.today,
    getTotal: () => snap.total,
    getSnapshot: () => snap,

    async addOne() {
      const l = local()
      storageSet(keyMine(), String(l.today + 1))
      storageSet(KEY_MINE_TOTAL, String(l.total + 1))
      if (pending.date !== todayKey()) pending = { date: todayKey(), flung: 0, laps: 0 }
      pending.flung += 1
      savePending()
      emit()
      return snap
    },

    addLaps(n) {
      mineLaps += n
      if (pending.date !== todayKey()) pending = { date: todayKey(), flung: 0, laps: 0 }
      pending.laps += n
      savePending()
      emit()
    },

    async refresh() {
      const fb = await getFirebase()
      if (!fb || !canTryServer()) return emit()
      try {
        const { db, fs } = fb
        const date = todayKey()
        const [d, t] = await withTimeout(Promise.all([fs.getDoc(fs.doc(db, 'daily', date)), fs.getDoc(fs.doc(db, 'counters', 'total'))]))
        const x = d.exists() ? d.data() : {}
        server = {
          date,
          flung: Number(x.flung) || 0,
          laps: Number(x.laps) || 0,
          visitors: Number(x.visitors) || 0,
          total: t.exists() ? Number(t.data().flung) || 0 : 0,
        }
        markOnline()
      } catch (e) {
        if (!isPermissionError(e)) markOffline(e)
      }
      emit()
    },

    async flush() {
      if (flushing || (pending.flung === 0 && pending.laps === 0)) return
      const fb = await getFirebase()
      if (!fb || !canTryServer()) return
      flushing = true
      const { db, fs } = fb
      const date = pending.date
      const f = Math.min(pending.flung, MAX_STEP)
      const lp = Math.min(pending.laps, MAX_STEP)
      try {
        const batch = fs.writeBatch(db)
        const daily: Record<string, unknown> = {}
        if (f > 0) daily.flung = fs.increment(f)
        if (lp > 0) daily.laps = fs.increment(lp)
        batch.set(fs.doc(db, 'daily', date), daily, { merge: true })
        if (f > 0) batch.set(fs.doc(db, 'counters', 'total'), { flung: fs.increment(f) }, { merge: true })
        await withTimeout(batch.commit())
        markOnline()
        pending.flung -= f
        pending.laps -= lp
        savePending()
        if (server && server.date === date) {
          server.flung += f
          server.laps += lp
          server.total += f
        } else {
          void service.refresh() // 서버 값을 아직 못 읽었으면 지금 읽음
        }
      } catch (e) {
        // 실패하면 그대로 두었다가 다음에 다시 보냄
        if (!isPermissionError(e)) markOffline(e)
      } finally {
        flushing = false
        emit()
      }
    },

    subscribe(l) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },

    start() {
      void (async () => {
        const fb = await getFirebase()
        if (fb && canTryServer() && storageGet(keyVisited()) !== '1') {
          // 오늘 첫 방문: 방문 기록 + 방문자 수 +1 (규칙이 사용자당 하루 1회만 허용)
          const { db, uid, fs } = fb
          const date = todayKey()
          try {
            const b = fs.writeBatch(db)
            b.set(fs.doc(db, 'visits', date, 'users', uid), { createdAt: fs.serverTimestamp() })
            b.set(fs.doc(db, 'daily', date), { visitors: fs.increment(1) }, { merge: true })
            await withTimeout(b.commit())
            storageSet(keyVisited(), '1')
          } catch (e) {
            if (isPermissionError(e)) storageSet(keyVisited(), '1') // 이미 오늘 집계됨
            else markOffline(e)
          }
        }
        await service.refresh()
      })()
      setInterval(() => void service.flush(), 10_000)
      if (typeof window !== 'undefined') {
        const bye = () => void service.flush()
        window.addEventListener('pagehide', bye)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') bye()
        })
      }
    },

    reset() {
      storageRemovePrefix('flung:')
      storageRemove(KEY_MINE_TOTAL)
      pending = { date: todayKey(), flung: 0, laps: 0 }
      savePending()
      emit()
    },
  }
  return service
}

/** 앱 전체가 쓰는 카운터 */
export const counterService: CounterService = createCounterService()
