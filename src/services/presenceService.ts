/**
 * 실시간 함께 있기 (Firebase Realtime Database).
 * - online/{uid} = 지금 있는 공간 이름 → "지금 N명" 표시
 * - presence/{공간}/{uid} = { i, x, z, r, p, l } → 같은 공간에 있는 사람의 캐릭터 위치·자세
 *   i: 이름표 번호(NICKNAMES 순서, 자유 글자 없음) · x,z: 위치 · r: 바라보는 방향 · p: 자세 · l: 앉은 높이
 * - 접속이 끊기면 서버가 onDisconnect 로 내 기록을 지움 (탭 닫기, 네트워크 끊김 모두)
 * - 화면을 30초 넘게 가리면 연결을 잠시 끊어 동시 접속 한도(무료 100명)를 아낌
 * - 설정(VITE_FIREBASE_DATABASE_URL)이 없거나 Firebase 연결에 실패하면 아무것도 하지 않음 (혼자 보는 모드)
 * - 상호작용(9단계): e/s = 반응 번호/보낸 횟수, g/gs/gk = 인사한 상대 uid/횟수/종류(0 인사, 1 맞인사)
 *   반응·인사 모두 정해진 번호만 보냄 (자유 글자 없음). 받는 쪽은 '횟수'가 바뀔 때만 한 번 보여 줌
 * - 위치·자세·반응 번호 말고는 아무것도 보내지 않음. 글, 기기 정보, 분석 값 없음
 */
import type { Database, DatabaseReference, OnDisconnect } from 'firebase/database'
import type { SceneId } from '../data/scenes'
import { NICKNAMES } from '../data/nicknames'
import { GREET_COOLDOWN_MS, REACTION_COOLDOWN_MS, REACTION_MS, reactionText } from '../data/reactions'
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
  /** 머리 위 반응 (until 까지 보임) */
  reaction: { text: string; until: number } | null
}

export type GreetEvent = { from: string; name: string; kind: 0 | 1 }

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

// 9단계: 반응·인사 (보낸 횟수가 바뀌어야 상대 화면에 한 번 뜸)
let myReact = { e: -1, s: 0 }
let myGreet = { g: '', gs: 0, gk: 0 as 0 | 1 }
let dirty = false
let lastReactAt = 0
const lastGreetTo = new Map<string, number>()
/** 상대별로 마지막으로 본 횟수 (처음 본 값은 지난 일이라 보여 주지 않음) */
const seenSeq = new Map<string, { s: number; gs: number }>()
const greetListeners = new Set<(e: GreetEvent) => void>()

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
    e: myReact.e,
    s: myReact.s,
    g: myGreet.g,
    gs: myGreet.gs,
    gk: myGreet.gk,
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
  const poseChanged = dirty || !last || last.p !== p.p || last.i !== p.i
  const moved = !last || Math.abs(last.x - p.x) > 0.03 || Math.abs(last.z - p.z) > 0.03 || Math.abs(last.r - p.r) > 0.08
  if (!poseChanged && !moved) return
  if (!poseChanged && last && now - last.at < SEND_MS) return
  last = { ...p, at: now }
  dirty = false
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
    reaction: null,
  }
}

/** 상대 기록에서 새 반응·나에게 온 인사를 찾음 */
function checkEvents(id: string, v: unknown, myUid: string, r: RemotePlayer) {
  const o = (v ?? {}) as Record<string, unknown>
  const s = typeof o.s === 'number' ? o.s : 0
  const gs = typeof o.gs === 'number' ? o.gs : 0
  const prev = seenSeq.get(id)
  seenSeq.set(id, { s, gs })
  const old = remotePlayers.get(id)
  r.reaction = old?.reaction ?? null
  if (!prev) return // 처음 본 사람: 예전 반응은 보여 주지 않음
  if (s !== prev.s && typeof o.e === 'number') {
    const text = reactionText(o.e)
    if (text) r.reaction = { text, until: Date.now() + REACTION_MS }
  }
  if (gs !== prev.gs && o.g === myUid) {
    const kind = o.gk === 1 ? 1 : 0
    greetListeners.forEach((l) => l({ from: id, name: r.name, kind }))
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
  seenSeq.clear()
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
        const v = child.val()
        const r = readRemote(id, v)
        if (!r) return
        checkEvents(id, v, uid, r)
        seen.add(id)
        remotePlayers.set(id, r)
      })
      for (const id of [...remotePlayers.keys()])
        if (!seen.has(id)) {
          remotePlayers.delete(id)
          seenSeq.delete(id)
        }
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

/** 머리 위에 반응 띄우기 (같은 공간 모두에게). 너무 자주 누르면 false */
export function sendReaction(id: number): boolean {
  const now = Date.now()
  if (now - lastReactAt < REACTION_COOLDOWN_MS || !reactionText(id)) return false
  lastReactAt = now
  myReact = { e: id, s: (myReact.s + 1) % 1_000_000 }
  dirty = true
  return true
}

/** 인사(0)·맞인사(1) 보내기. 같은 사람에게 너무 자주 인사하면 false */
export function sendGreet(to: string, kind: 0 | 1): boolean {
  const now = Date.now()
  const key = `${to}:${kind}`
  if (now - (lastGreetTo.get(key) ?? 0) < GREET_COOLDOWN_MS) return false
  lastGreetTo.set(key, now)
  myGreet = { g: to, gs: (myGreet.gs + 1) % 1_000_000, gk: kind }
  dirty = true
  return true
}

/** 나에게 온 인사 알림 받기 */
export function onGreet(l: (e: GreetEvent) => void) {
  greetListeners.add(l)
  return () => {
    greetListeners.delete(l)
  }
}

// 개발 중 확인용 (배포 빌드에는 들어가지 않음)
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __remote: remotePlayers })
