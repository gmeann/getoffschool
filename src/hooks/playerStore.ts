import * as THREE from 'three'
import {
  BENCHES,
  OBSTACLES,
  PLAYER_START,
  WORLD_RADIUS,
  laneAngleOf,
  lanePoint,
  seatInfo,
  type Circle,
} from '../data/world'
import { addDistance } from './lapStore'

/**
 * 내 캐릭터의 상태와 동작 명령을 한곳에서 관리하는 작은 저장소.
 * - 매 프레임 바뀌는 값(위치 등)은 그냥 객체에 두고 useFrame 에서 읽음 (리렌더 없음)
 * - 버튼 글자처럼 UI 에 필요한 값(mode, skyLook)만 구독(subscribe)으로 알림
 */

export type Mode = 'idle' | 'walk' | 'run' | 'toBench' | 'sit'
export type Pose = 'stand' | 'walk' | 'run' | 'sit'

const WALK_SPEED = 2.8
const RUN_SPEED = 5.2
const TURN_SPEED = 10
export const PLAYER_RADIUS = 0.35
const ARRIVE_EPS = 0.06
/** 달릴 때 트랙에서 앞쪽 몇 라디안을 목표로 삼을지 */
const RUN_LOOKAHEAD = 0.3

export const player = {
  position: new THREE.Vector3(PLAYER_START.x, 0, PLAYER_START.z),
  yaw: 0,
  target: null as THREE.Vector3 | null,
  mode: 'idle' as Mode,
  pose: 'stand' as Pose,
  benchIndex: -1,
  skyLook: false,
  stuckTime: 0,
}

// ---------- UI 구독 ----------
export type PlayerUi = { mode: Mode; skyLook: boolean }
let uiSnap: PlayerUi = { mode: player.mode, skyLook: player.skyLook }
const listeners = new Set<() => void>()

function emitUi() {
  if (uiSnap.mode !== player.mode || uiSnap.skyLook !== player.skyLook) {
    uiSnap = { mode: player.mode, skyLook: player.skyLook }
    listeners.forEach((l) => l())
  }
}
export function subscribePlayer(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function getPlayerUi() {
  return uiSnap
}

// ---------- 충돌 ----------
export function resolveCollisions(p: { x: number; z: number }, obstacles: Circle[] = OBSTACLES, extra = 0) {
  for (const o of obstacles) {
    const dx = p.x - o.x
    const dz = p.z - o.z
    const min = o.r + PLAYER_RADIUS + extra
    const d2 = dx * dx + dz * dz
    if (d2 < min * min) {
      const d = Math.sqrt(d2) || 0.0001
      p.x = o.x + (dx / d) * min
      p.z = o.z + (dz / d) * min
    }
  }
  const len = Math.hypot(p.x, p.z)
  const max = WORLD_RADIUS - PLAYER_RADIUS
  if (len > max) {
    p.x = (p.x / len) * max
    p.z = (p.z / len) * max
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

// ---------- 명령 ----------
function standUp() {
  if (player.mode !== 'sit') return
  const info = seatInfo(player.benchIndex, 1)
  player.position.set(info.front.x, 0, info.front.z)
  player.mode = 'idle'
  player.pose = 'stand'
}

/** 바닥 클릭: 그 지점으로 걸어감 (달리기·앉기·하늘 보기는 풀림) */
export function walkTo(point: THREE.Vector3) {
  standUp()
  const t = new THREE.Vector3(point.x, 0, point.z)
  resolveCollisions(t, OBSTACLES, 0.05)
  player.target = t
  player.mode = 'walk'
  player.skyLook = false
  player.stuckTime = 0
  emitUi()
  return t
}

/** 뛰기 ↔ 멈추기 */
export function toggleRun() {
  if (player.mode === 'run') {
    player.mode = 'idle'
    player.target = null
  } else {
    standUp()
    player.mode = 'run'
    player.target = null
    player.skyLook = false
  }
  emitUi()
}

/** 앉기(가장 가까운 벤치로 걸어가서 앉음) ↔ 일어나기 */
export function toggleSit() {
  if (player.mode === 'sit' || player.mode === 'toBench') {
    if (player.mode === 'sit') standUp()
    else player.mode = 'idle'
    player.target = null
    emitUi()
    return
  }
  let best = 0
  let bestD = Infinity
  BENCHES.forEach((_, i) => {
    const f = seatInfo(i, 1).front
    const d = Math.hypot(f.x - player.position.x, f.z - player.position.z)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  const f = seatInfo(best, 1).front
  player.benchIndex = best
  player.target = new THREE.Vector3(f.x, 0, f.z)
  player.mode = 'toBench'
  player.skyLook = false
  player.stuckTime = 0
  emitUi()
}

/** 하늘 보기 ↔ 원래대로. 걷거나 뛰던 중이면 멈춰 서서 봄 (앉아 있으면 앉은 채로) */
export function toggleSky() {
  if (player.skyLook) {
    player.skyLook = false
  } else {
    if (player.mode === 'walk' || player.mode === 'run' || player.mode === 'toBench') {
      player.mode = 'idle'
      player.target = null
    }
    player.skyLook = true
  }
  emitUi()
}

// ---------- 매 프레임 ----------
const runTarget = new THREE.Vector3()

export function updatePlayer(rawDt: number) {
  const dt = Math.min(rawDt, 0.05)
  const p = player.position

  if (player.mode === 'sit') {
    // 좌석으로 살짝 미끄러지듯 자리 잡기
    const info = seatInfo(player.benchIndex, 1)
    const k = 1 - Math.exp(-8 * dt)
    p.x += (info.seat.x - p.x) * k
    p.z += (info.seat.z - p.z) * k
    player.yaw = lerpAngle(player.yaw, info.yaw, k)
    player.pose = 'sit'
    return
  }

  let target: THREE.Vector3 | null = player.target
  let speed = WALK_SPEED
  if (player.mode === 'run') {
    const theta = laneAngleOf(p.x, p.z) + RUN_LOOKAHEAD
    const lp = lanePoint(theta)
    target = runTarget.set(lp.x, 0, lp.z)
    speed = RUN_SPEED
  }

  if (!target || player.mode === 'idle') {
    player.pose = 'stand'
    return
  }

  const dx = target.x - p.x
  const dz = target.z - p.z
  const dist = Math.hypot(dx, dz)
  if (player.mode !== 'run' && dist < ARRIVE_EPS) {
    arrive()
    return
  }
  const step = Math.min(dist, speed * dt)
  const prevX = p.x
  const prevZ = p.z
  p.x += (dx / dist) * step
  p.z += (dz / dist) * step
  resolveCollisions(p)

  const mx = p.x - prevX
  const mz = p.z - prevZ
  const moved = Math.hypot(mx, mz)
  if (moved > 0.0005) {
    player.yaw = lerpAngle(player.yaw, Math.atan2(mx, mz), 1 - Math.exp(-TURN_SPEED * dt))
    addDistance(moved)
  }
  player.pose = player.mode === 'run' ? 'run' : 'walk'

  // 걷다가 장애물에 막혀 거의 못 움직이면 멈춤
  if (player.mode !== 'run') {
    if (moved < step * 0.2) {
      player.stuckTime += dt
      if (player.stuckTime > 0.4) {
        if (player.mode === 'toBench') arrive()
        else stop()
      }
    } else {
      player.stuckTime = 0
    }
  }
}

function arrive() {
  if (player.mode === 'toBench') {
    player.mode = 'sit'
    player.pose = 'sit'
  } else {
    player.mode = 'idle'
    player.pose = 'stand'
  }
  player.target = null
  emitUi()
}

function stop() {
  player.mode = 'idle'
  player.pose = 'stand'
  player.target = null
  emitUi()
}

// 개발 중 확인용 (배포 빌드에는 들어가지 않음)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  Object.assign(window, { __player: player, __addDistance: addDistance })
}
