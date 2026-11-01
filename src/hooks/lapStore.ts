import { LAP_LENGTH } from '../data/world'
import { storageGet, storageSet, todayKey } from './clock'

/**
 * 걸음 거리 → 바퀴 수. localStorage 에 날짜별로 저장.
 * 키: getoffschool:meters:YYYY-MM-DD, getoffschool:titles
 */

export const TITLE_10_LAPS = '운동장 10바퀴'
const read = storageGet
const write = storageSet

let day = todayKey()
let meters = Number(read(`meters:${day}`)) || 0
let titles: string[] = (() => {
  try {
    const v = JSON.parse(read('titles') || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
})()
let lastSave = 0

export type LapUi = { laps: number; titles: string[] }
/** 화면 표시용: 0.1바퀴 단위로만 바뀌게 해서 리렌더를 줄임 */
let snap: LapUi = { laps: Math.floor((meters / LAP_LENGTH) * 10) / 10, titles }
const listeners = new Set<() => void>()

export type LapEvent = { type: 'lap'; lap: number } | { type: 'title'; title: string }
const eventListeners = new Set<(e: LapEvent) => void>()

export function subscribeLaps(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function getLapUi() {
  return snap
}
export function onLapEvent(l: (e: LapEvent) => void) {
  eventListeners.add(l)
  return () => {
    eventListeners.delete(l)
  }
}

function save(force = false) {
  const now = performance.now()
  if (!force && now - lastSave < 2000) return
  lastSave = now
  write(`meters:${day}`, String(Math.round(meters * 10) / 10))
}

export function addDistance(d: number) {
  // 자정이 지나면 새 날짜로 다시 시작
  const k = todayKey()
  if (k !== day) {
    save(true)
    day = k
    meters = 0
  }
  const before = Math.floor(meters / LAP_LENGTH)
  meters += d
  const after = Math.floor(meters / LAP_LENGTH)

  if (after > before) {
    save(true)
    eventListeners.forEach((l) => l({ type: 'lap', lap: after }))
    if (after >= 10 && !titles.includes(TITLE_10_LAPS)) {
      titles = [...titles, TITLE_10_LAPS]
      write('titles', JSON.stringify(titles))
      eventListeners.forEach((l) => l({ type: 'title', title: TITLE_10_LAPS }))
    }
  } else {
    save()
  }

  const laps = Math.floor((meters / LAP_LENGTH) * 10) / 10
  if (laps !== snap.laps || titles !== snap.titles) {
    snap = { laps, titles }
    listeners.forEach((l) => l())
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => save(true))
}
