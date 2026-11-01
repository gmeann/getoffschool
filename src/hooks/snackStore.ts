import { rollSnack, type Snack } from '../data/snacks'
import type { NpcId } from '../data/npcs'
import { RESET_REQUESTED, storageGet, storageRemove, storageSet, todayKey } from './clock'

/**
 * 간식 도감과 "오늘 받았는지" 기록 (localStorage).
 * 키: getoffschool:snacks = { 간식id: 개수 }, getoffschool:snackGiven = { npcId: 'YYYY-MM-DD' }
 * 개발 확인용: ?reset=1 이면 두 기록을 지움 (clock.ts 의 RESET_REQUESTED)
 */

const KEY_COLLECTION = 'snacks'
const KEY_GIVEN = 'snackGiven'

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(storageGet(key) || 'null')
    return v && typeof v === 'object' ? (v as T) : fallback
  } catch {
    return fallback
  }
}

if (RESET_REQUESTED) {
  storageRemove(KEY_COLLECTION)
  storageRemove(KEY_GIVEN)
}

export type SnackUi = { collection: Record<string, number>; given: Partial<Record<NpcId, string>> }
let snap: SnackUi = {
  collection: readJson(KEY_COLLECTION, {}),
  given: readJson(KEY_GIVEN, {}),
}
const listeners = new Set<() => void>()

export function subscribeSnacks(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function getSnackUi() {
  return snap
}

export function receivedToday(npc: NpcId, ui: SnackUi = snap) {
  return ui.given[npc] === todayKey()
}

/** 간식 받기. 오늘 이미 받았으면 null */
export function receiveSnack(npc: NpcId): Snack | null {
  if (receivedToday(npc)) return null
  const snack = rollSnack()
  snap = {
    collection: { ...snap.collection, [snack.id]: (snap.collection[snack.id] ?? 0) + 1 },
    given: { ...snap.given, [npc]: todayKey() },
  }
  storageSet(KEY_COLLECTION, JSON.stringify(snap.collection))
  storageSet(KEY_GIVEN, JSON.stringify(snap.given))
  listeners.forEach((l) => l())
  return snack
}
