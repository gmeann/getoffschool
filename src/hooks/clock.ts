/**
 * 오늘 날짜 키 (기기 로컬 날짜, 자정 기준).
 * 개발 확인용: ?date=2026-11-02 를 붙이면 그 날짜로 강제.
 */
function forcedDate(): string | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('date')
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

export function todayKey(): string {
  const f = forcedDate()
  if (f) return f
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** localStorage 를 안전하게 읽고 쓰기 (사생활 보호 모드 등에서 실패해도 앱은 계속) */
const PREFIX = 'getoffschool:'
export function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}
/** 기록을 지운 뒤 새로고침하기 전까지는 아무것도 다시 쓰지 않음 (페이지를 떠날 때 저장하는 코드 대비) */
let frozen = false
export function storageSet(key: string, value: string) {
  if (frozen) return
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    /* 저장 없이 진행 */
  }
}
/** 이름이 prefix 로 시작하는 기록을 모두 지움 (예: 'pile:' → 모든 날짜의 서류 더미) */
export function storageRemovePrefix(prefix: string) {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX + prefix)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* 무시 */
  }
}
export function storageRemove(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* 무시 */
  }
}

/**
 * 개발 확인용 ?reset=1: 앱이 켜질 때 한 번만 확인하고 주소에서 뺌.
 * 각 저장소(간식·도감, 서류 더미, 카운터, 칭호)가 이 값을 보고 자기 기록을 지움.
 */
export const RESET_REQUESTED: boolean = (() => {
  if (typeof window === 'undefined') return false
  const url = new URL(window.location.href)
  if (url.searchParams.get('reset') !== '1') return false
  url.searchParams.delete('reset')
  window.history.replaceState(null, '', url.toString())
  return true
})()

/** 이 기기의 퇴근길 학교 기록을 모두 지움 (keep 에 적은 키는 남김) */
export function clearLocalData(keep: string[] = []) {
  const saved = keep.map((k) => [k, storageGet(k)] as const)
  storageRemovePrefix('')
  saved.forEach(([k, v]) => v !== null && storageSet(k, v))
  frozen = true
}
