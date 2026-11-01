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
export function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch {
    /* 저장 없이 진행 */
  }
}
export function storageRemove(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* 무시 */
  }
}
