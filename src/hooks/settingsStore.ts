/**
 * 설정 (이 기기에만 저장). 키: getoffschool:settings
 * 소리는 기본으로 꺼져 있고, 사용자가 켜면 다음 접속에도 켜진 상태로 기억함.
 */
import { storageGet, storageSet } from './clock'

export type Settings = {
  /** 배경음악 */
  bgm: boolean
  bgmVolume: number
  /** 효과음 */
  sfx: boolean
  sfxVolume: number
  /** 저사양 모드: 해상도 낮춤 + 산책하는 선생님 수 줄임 */
  lowSpec: boolean
  /** 글·마음을 나눌 때 기본으로 '익명의 선생님' */
  anonDefault: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  bgm: false,
  bgmVolume: 0.6,
  sfx: false,
  sfxVolume: 0.7,
  lowSpec: false,
  anonDefault: false,
}

const KEY = 'settings'

function read(): Settings {
  try {
    const v = JSON.parse(storageGet(KEY) || 'null')
    return v && typeof v === 'object' ? { ...DEFAULT_SETTINGS, ...v } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

let snap = read()
const listeners = new Set<() => void>()

export function getSettings() {
  return snap
}
export function subscribeSettings(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function updateSettings(patch: Partial<Settings>) {
  snap = { ...snap, ...patch }
  storageSet(KEY, JSON.stringify(snap))
  listeners.forEach((l) => l())
}
