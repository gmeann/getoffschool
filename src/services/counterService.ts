/**
 * "날린 업무" 카운터 서비스.
 *
 * 화면은 이 인터페이스만 사용합니다. 지금은 localStorage 구현(localCounterService)이 들어 있고,
 * 나중에 서버에서 공유 값을 가져오려면 같은 인터페이스를 따르는 구현을 만들어
 * 맨 아래 `counterService` 한 줄만 바꾸면 됩니다.
 */
import { RESET_REQUESTED, storageGet, storageRemove, storageRemovePrefix, storageSet, todayKey } from '../hooks/clock'

export type CounterSnapshot = {
  /** 오늘 날린 장수 (날짜별) */
  today: number
  /** 지금까지 날린 전체 장수 */
  total: number
}

export interface CounterService {
  /** 오늘 날린 장수 */
  getToday(): number
  /** 누적 장수 */
  getTotal(): number
  /** 화면 표시용 현재 값 (같은 값이면 같은 객체를 돌려줌) */
  getSnapshot(): CounterSnapshot
  /** 한 장 날렸을 때. 서버 구현에서는 비동기가 될 수 있어 Promise 를 돌려줌 */
  addOne(): Promise<CounterSnapshot>
  /** 값이 바뀌면 알림 (React useSyncExternalStore 와 맞춤) */
  subscribe(listener: () => void): () => void
  /** 개발용 초기화 */
  reset(): void
}

/** localStorage 구현. 키: getoffschool:flung:YYYY-MM-DD, getoffschool:flungTotal */
function createLocalCounterService(): CounterService {
  const KEY_TOTAL = 'flungTotal'
  const keyToday = () => `flung:${todayKey()}`
  const listeners = new Set<() => void>()

  const read = () => ({
    today: Number(storageGet(keyToday())) || 0,
    total: Number(storageGet(KEY_TOTAL)) || 0,
  })
  let snap: CounterSnapshot = read()
  const emit = () => {
    const next = read()
    if (next.today !== snap.today || next.total !== snap.total) {
      snap = next
      listeners.forEach((l) => l())
    }
  }

  const service: CounterService = {
    getToday: () => read().today,
    getTotal: () => read().total,
    getSnapshot: () => snap,
    async addOne() {
      const cur = read()
      storageSet(keyToday(), String(cur.today + 1))
      storageSet(KEY_TOTAL, String(cur.total + 1))
      emit()
      return snap
    },
    subscribe(l) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    reset() {
      storageRemovePrefix('flung:')
      storageRemove(KEY_TOTAL)
      emit()
    },
  }
  return service
}

/** 앱 전체가 쓰는 카운터. 서버 구현으로 바꿀 때는 이 줄만 교체 */
export const counterService: CounterService = createLocalCounterService()

if (RESET_REQUESTED) counterService.reset()
