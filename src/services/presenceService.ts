/**
 * 실시간 함께 있기 (Firebase Realtime Database).
 * - online/{uid} = 지금 있는 공간 이름 → "지금 N명" 표시
 * - presence/{공간}/{uid} = { i, x, z, r, p, l } → 같은 공간에 있는 사람의 캐릭터 위치·자세
 *   i: 이름표 번호(NICKNAMES 순서, 자유 글자 없음) · x,z: 위치 · r: 바라보는 방향 · p: 자세 · l: 앉은 높이
 * - 접속이 끊기면 서버가 onDisconnect 로 내 기록을 지움 (탭 닫기, 네트워크 끊김 모두)
 * - 화면을 30초 넘게 가리면 연결을 잠시 끊어 동시 접속 한도(무료 100명)를 아낌
 * - 설정(VITE_FIREBASE_DATABASE_URL)이 없거나 Firebase 연결에 실패하면 아무것도 하지 않음 (혼자 보는 모드)
 * - 위치·자세 말고는 아무것도 보내지 않음. 글, 기기 정보, 분석 값 없음
 */
import type { Database, DatabaseReference, OnDisconnect } from 'firebase/database'
import type { SceneId } from '../data/scenes'
import { NICKNAMES } from '../data/nicknames'
import { player, type Pose } from '../hooks/playerStore'
import { getFirebase, OFFLINE_FORCED, USE_EMULATOR } from './firebase'

type DbModule = typeof import('firebase/database')

export type RemotePlayer = {
  uid: string
  name: string
  x: number
  z: number
  yaw: number
  pose: Pose
  lift: number
}

export type PresenceSnapshot = {
  /** 연결되어 실시간 정보를 보여 주는 중인지 */
  live: boolean
  /** 지금 접속한 사람 수 (나 포함) */
  onlineCount: number
  /** 같은 공간에 있는 다른 사람들의 uid (목록이 바뀔 때만 새 배열) */
  others: string[]
}

const DATABASE_URL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined
const POSES: Pose[] = ['stand', 'walk', 'run', 'sit', 'bow']
/** 움직이는 동안 위치를 보내는 간격 (받는 쪽은 그 사이를 부드럽게 이어서 그림) */
const SEND_MS = 500
const CHECK_MS = 150
/** 화면을 가린 뒤 연결을 끊기까지 */
const HIDDEN_DISCONNECT_MS = 30_000
/** 한 공간에서 그리는 최대 인원 (많아지면 가까운 순이 아니라 먼저 들어온 순) */
export const MAX_OTHERS = 30

/** 다른 사람의 최신 위치 (매 프레임 읽기용, 바뀌어도 리렌더 없음) */
export const remotePlayers = new Map<string, RemotePlayer>()

let snap: PresenceSnapshot = { live: false, onlineCount: 0, others: [] }
const listeners = new Set<() => void>()
function emit(next: Partial<PresenceSnapshot>) {
  const merged = { ...snap, ...next }
  if (merged.live === snap.live && merged.onlineCount === snap.onlineCount && merged.others === snap.others) return
  snap = merged
  listeners.forEach((l) => l())
}

export function subscribePresence(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function getPresence() {
  return snap
}

type Conn = { db: Database; dbm: DbModule; uid: string }
let conn: Conn | null = null
let starting: Promise<Conn | null> | null = null
let connected = false

let scene: SceneId | null = null
let nameIndex = -1
let myRef: DatabaseReference | null = null
let myDisc: OnDisconnect | null = null
let unsubScene: (() => void) | null = null
let last: { x: number; z: number; r: number; p: Pose; l: number; i: number; at: number } | null = null
let timer = 0

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d
/** 방향을 -π~π 로 (계속 돌면 값이 커질 수 있어서) */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

function payload() {
  return {
    i: nameIndex,
    x: round(player.position.x),
    z: round(player.position.z),
    r: round(wrap(player.yaw)),
    p: player.pose,
    l: round(player.sitLift),
  }
}

async function connect(): Promise<Conn | null> {
  if (conn) return conn
  if (starting) return starting
  starting = (async () => {
    if (OFFLINE_FORCED || (!DATABASE_URL && !USE_EMULATOR)) return null
    const fb = await getFirebase()
    if (!fb) return null
    try {
      const [{ getApp }, dbm] = await Promise.all([import('firebase/app'), import('firebase/database')])
      const db = dbm.getDatabase(getApp(), USE_EMULATOR ? 'https://demo-getoffschool-default-rtdb.firebaseio.com' : DATABASE_URL)
      if (USE_EMULATOR) dbm.connectDatabaseEmulator(db, window.location.hostname || '127.0.0.1', 9000)
      conn = { db, dbm, uid: fb.uid }

      // 다시 연결될 때마다 내 기록과 onDisconnect 를 새로 등록 (폰이 잠깐 잠들었다 깨는 경우 등)
      dbm.onValue(dbm.ref(db, '.info/connected'), (s) => {
        connected = s.val() === true
        if (connected) void announce()
        else emit({ live: false })
      })

      // 지금 접속한 사람 수 (값은 공간 이름 몇 글자뿐이라 가벼움)
      dbm.onValue(
        dbm.ref(db, 'online'),
        (s) => emit({ onlineCount: Math.max(1, s.size) }),
        () => emit({ live: false }),
      )

      document.addEventListener('visibilitychange', onVisibility)
      return conn
    } catch {
      return null
    }
  })()
  return starting
}

/** 내 접속 기록 + 지금 공간의 내 캐릭터를 올리고, 끊기면 지워지게 예약 */
async function announce() {
  const c = conn
  if (!c || !connected || !scene) return
  const { dbm, db, uid } = c
  try {
    const onlineRef = dbm.ref(db, `online/${uid}`)
    await dbm.onDisconnect(onlineRef).remove()
    await dbm.set(onlineRef, scene)
    if (myRef && myDisc) {
      await myDisc.remove()
      const p = payload()
      await dbm.set(myRef, p)
      last = { ...p, at: Date.now() }
    }
    emit({ live: true })
  } catch {
    emit({ live: false })
  }
}

function onVisibility() {
  const c = conn
  if (!c) return
  window.clearTimeout(hiddenTimer)
  if (document.hidden) {
    hiddenTimer = window.setTimeout(() => c.dbm.goOffline(c.db), HIDDEN_DISCONNECT_MS)
  } else {
    c.dbm.goOnline(c.db)
  }
}
let hiddenTimer = 0

/** 움직임이 있을 때만 보냄. 멈춰 있으면 아무것도 보내지 않음 */
function tick() {
  const c = conn
  if (!c || !connected || !myRef) return
  const p = payload()
  const now = Date.now()
  const poseChanged = !last || last.p !== p.p || last.i !== p.i
  const moved = !last || Math.abs(last.x - p.x) > 0.03 || Math.abs(last.z - p.z) > 0.03 || Math.abs(last.r - p.r) > 0.08
  if (!poseChanged && !moved) return
  if (!poseChanged && last && now - last.at < SEND_MS) return
  last = { ...p, at: now }
  c.dbm.set(myRef, p).catch(() => undefined)
}

function readRemote(uid: string, v: unknown): RemotePlayer | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const num = (k: string) => (typeof o[k] === 'number' && Number.isFinite(o[k]) ? (o[k] as number) : null)
  const x = num('x')
  const z = num('z')
  if (x === null || z === null) return null
  const i = num('i') ?? -1
  const pose = POSES.includes(o.p as Pose) ? (o.p as Pose) : 'stand'
  return {
    uid,
    name: i >= 0 && i < NICKNAMES.length ? NICKNAMES[i] : '선생님',
    x,
    z,
    yaw: num('r') ?? 0,
    pose,
    lift: num('l') ?? 0.24,
  }
}

/** 공간을 옮길 때: 이전 공간의 내 캐릭터를 지우고 새 공간에 올림 */
export async function setPresenceScene(next: SceneId) {
  if (scene === next) return
  scene = next
  const c = await connect()
  if (!c || scene !== next) return
  const { dbm, db, uid } = c

  // 이전 공간 정리
  unsubScene?.()
  unsubScene = null
  if (myRef) {
    const old = myRef
    myRef = null
    myDisc?.cancel().catch(() => undefined)
    dbm.remove(old).catch(() => undefined)
  }
  remotePlayers.clear()
  emit({ others: [] })

  myRef = dbm.ref(db, `presence/${next}/${uid}`)
  myDisc = dbm.onDisconnect(myRef)
  last = null
  await announce()

  // 같은 공간 사람들 받기
  unsubScene = dbm.onValue(
    dbm.ref(db, `presence/${next}`),
    (s) => {
      const seen = new Set<string>()
      s.forEach((child) => {
        const id = child.key
        if (!id || id === uid || seen.size >= MAX_OTHERS) return
        const r = readRemote(id, child.val())
        if (!r) return
        seen.add(id)
        remotePlayers.set(id, r)
      })
      for (const id of [...remotePlayers.keys()]) if (!seen.has(id)) remotePlayers.delete(id)
      const ids = [...seen].sort()
      const same = ids.length === snap.others.length && ids.every((id, k) => id === snap.others[k])
      if (!same) emit({ others: ids })
    },
    () => {
      remotePlayers.clear()
      emit({ others: [], live: false })
    },
  )

  window.clearInterval(timer)
  timer = window.setInterval(tick, CHECK_MS)
}

/** 이름을 다시 뽑으면 다른 사람 화면의 이름표도 바뀜 */
export function setPresenceName(name: string) {
  nameIndex = (NICKNAMES as readonly string[]).indexOf(name)
}
