/**
 * Firebase 연결 (익명 로그인 + Firestore).
 * - 설정은 .env.local / GitHub 레포 Variables 의 VITE_FIREBASE_* 로 읽음
 * - ?offline=1 이거나 설정이 없거나 연결에 실패하면 null → 각 서비스가 "혼자 보는 모드"로 동작
 * - uid 는 내부에서만 사용 (화면에 보이지 않음)
 * - Analytics 는 쓰지 않음 (마음 띄우기 원칙: 분석 도구 금지)
 */
import type { Firestore } from 'firebase/firestore'

export type FirestoreModule = typeof import('firebase/firestore')
export type Fb = { db: Firestore; uid: string; fs: FirestoreModule }

export type NetStatus = 'connecting' | 'online' | 'offline'

let status: NetStatus = 'connecting'
const listeners = new Set<() => void>()
function setStatus(s: NetStatus) {
  if (status === s) return
  status = s
  listeners.forEach((l) => l())
}
export function getNetStatus() {
  return status
}
export function subscribeNetStatus(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/**
 * 서버 문제(느린 응답·네트워크 끊김·한도 초과)가 생기면 잠시 혼자 보는 모드로.
 * 일정 시간이 지나면 다음 호출에서 서버를 다시 시도하고, 성공하면 공유 모드로 돌아옴.
 */
let signedIn = false
let retryAt = 0
const RETRY_MS = 45_000
const RETRY_QUOTA_MS = 10 * 60_000
export function markOffline(e?: unknown) {
  const code = typeof e === 'object' && e !== null ? (e as { code?: string }).code : undefined
  retryAt = Date.now() + (code === 'resource-exhausted' ? RETRY_QUOTA_MS : RETRY_MS)
  setStatus('offline')
}
export function markOnline() {
  if (signedIn) setStatus('online')
}
/** 공유 값을 보여 줘도 되는 상태인지 */
export function isOnline() {
  return status === 'online'
}
/** 서버를 써 봐도 되는지: 온라인이거나, 실패 후 재시도 시간이 지났으면 한 번 시도 */
export function canTryServer() {
  return signedIn && (status === 'online' || Date.now() >= retryAt)
}

/** 너무 오래 걸리면 실패로 처리 */
export function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'deadline-exceeded' })), ms)
    p.then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (e) => {
        clearTimeout(id)
        reject(e)
      },
    )
  })
}

/** 규칙에 막힌 경우 (도배 방지 30초, 중복 반응 등) — 서버 장애와 구분 */
export function isPermissionError(e: unknown) {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'permission-denied'
}

const env = import.meta.env
export const USE_EMULATOR = env.VITE_USE_EMULATOR === '1'
export const OFFLINE_FORCED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('offline') === '1'

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: (USE_EMULATOR ? 'demo-getoffschool' : env.VITE_FIREBASE_PROJECT_ID) as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
}
const configured = USE_EMULATOR || Boolean(config.apiKey && config.projectId && config.appId)

let promise: Promise<Fb | null> | null = null

/** 처음 부를 때 한 번만 연결 (Firebase 코드는 필요할 때 따로 불러와 첫 화면을 가볍게) */
export function getFirebase(): Promise<Fb | null> {
  if (promise) return promise
  promise = (async () => {
    if (OFFLINE_FORCED || !configured) {
      setStatus('offline')
      return null
    }
    try {
      const [{ initializeApp }, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
      const app = initializeApp({ ...config, apiKey: config.apiKey || 'demo-key' })
      const a = auth.getAuth(app)
      const db = fs.getFirestore(app)
      if (USE_EMULATOR) {
        const host = window.location.hostname || '127.0.0.1'
        auth.connectAuthEmulator(a, `http://${host}:9099`, { disableWarnings: true })
        fs.connectFirestoreEmulator(db, host, 8080)
      }
      const cred = await withTimeout(auth.signInAnonymously(a), 15000)
      signedIn = true
      setStatus('online')
      return { db, uid: cred.user.uid, fs }
    } catch {
      setStatus('offline')
      return null
    }
  })()
  return promise
}
