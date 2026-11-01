import * as THREE from 'three'
import {
  GROUND_SIT_LIFT,
  PLAYER_START,
  PLAYGROUND_WORLD,
  laneAngleOf,
  lanePoint,
  type Seat,
  type World,
} from '../data/world'
import type { Spawn } from '../data/scenes'
import { addDistance } from './lapStore'

/**
 * 내 캐릭터의 상태와 동작 명령을 한곳에서 관리하는 작은 저장소.
 * - 매 프레임 바뀌는 값(위치 등)은 그냥 객체에 두고 useFrame 에서 읽음 (리렌더 없음)
 * - 버튼 글자처럼 UI 에 필요한 값(mode, skyLook)만 구독(subscribe)으로 알림
 */

export type Mode = 'idle' | 'walk' | 'run' | 'toSeat' | 'sit'
export type Pose = 'stand' | 'walk' | 'run' | 'sit' | 'bow'

const WALK_SPEED = 2.2
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
  /** 가구를 돌아가기 위한 중간 경유점 (목표 지점 전까지) */
  path: [] as { x: number; z: number }[],
  mode: 'idle' as Mode,
  pose: 'stand' as Pose,
  /** 앉으러 가는 / 앉아 있는 자리 */
  seat: null as Seat | null,
  /** 앉았을 때 몸 높이 (벤치·의자는 위로, 잔디는 아래로) */
  sitLift: 0.24,
  skyLook: false,
  stuckTime: 0,
  /** 인사(고개 숙이기) 남은 시간 */
  bowTime: 0,
  /** 걸어가서 도착하면 실행할 일 (문 열기, NPC 대화 등) */
  interact: null as Interact | null,
}

export type Interact = { x: number; z: number; radius: number; onArrive: () => void }

/** 지금 장면의 충돌 정보 (장면이 바뀔 때 setWorld 로 교체) */
let world: World = PLAYGROUND_WORLD
export function setWorld(w: World) {
  world = w
}

/** 장면을 옮길 때 위치와 상태를 초기화 */
export function resetForScene(spawn: Spawn) {
  player.position.set(spawn.x, 0, spawn.z)
  player.yaw = spawn.yaw
  player.target = null
  player.mode = 'idle'
  player.pose = 'stand'
  player.skyLook = false
  player.bowTime = 0
  player.interact = null
  player.seat = null
  player.path = []
  emitUi()
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
export function resolveCollisions(p: { x: number; z: number }, extra = 0) {
  const R = PLAYER_RADIUS + extra
  for (const o of world.circles) {
    const dx = p.x - o.x
    const dz = p.z - o.z
    const min = o.r + R
    const d2 = dx * dx + dz * dz
    if (d2 < min * min) {
      const d = Math.sqrt(d2) || 0.0001
      p.x = o.x + (dx / d) * min
      p.z = o.z + (dz / d) * min
    }
  }
  for (const b of world.boxes) {
    // 캐릭터 반지름만큼 넓힌 사각형 안이면 가장 가까운 변 밖으로 밀어냄
    const minX = b.minX - R
    const maxX = b.maxX + R
    const minZ = b.minZ - R
    const maxZ = b.maxZ + R
    if (p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ) {
      const dl = p.x - minX
      const dr = maxX - p.x
      const dn = p.z - minZ
      const ds = maxZ - p.z
      const m = Math.min(dl, dr, dn, ds)
      if (m === dl) p.x = minX
      else if (m === dr) p.x = maxX
      else if (m === dn) p.z = minZ
      else p.z = maxZ
    }
  }
  const bd = world.bounds
  if (bd.kind === 'circle') {
    const len = Math.hypot(p.x, p.z)
    const max = bd.r - PLAYER_RADIUS
    if (len > max) {
      p.x = (p.x / len) * max
      p.z = (p.z / len) * max
    }
  } else {
    p.x = Math.min(Math.max(p.x, bd.minX + PLAYER_RADIUS), bd.maxX - PLAYER_RADIUS)
    p.z = Math.min(Math.max(p.z, bd.minZ + PLAYER_RADIUS), bd.maxZ - PLAYER_RADIUS)
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

// ---------- 길찾기: 사각형 가구의 모서리를 경유해 돌아가기 ----------
const PATH_PAD = PLAYER_RADIUS + 0.12

/** 선분이 (넓힌) 사각형 안을 지나는지: 슬랩 방식 */
function segmentHitsBox(ax: number, az: number, bx: number, bz: number, b: { minX: number; maxX: number; minZ: number; maxZ: number }, pad: number) {
  const minX = b.minX - pad
  const maxX = b.maxX + pad
  const minZ = b.minZ - pad
  const maxZ = b.maxZ + pad
  let t0 = 0
  let t1 = 1
  const dx = bx - ax
  const dz = bz - az
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) return q >= 0
    const r = q / p
    if (p < 0) {
      if (r > t1) return false
      if (r > t0) t0 = r
    } else {
      if (r < t0) return false
      if (r < t1) t1 = r
    }
    return true
  }
  if (!clip(-dx, ax - minX) || !clip(dx, maxX - ax) || !clip(-dz, az - minZ) || !clip(dz, maxZ - az)) return false
  return t1 - t0 > 1e-4
}

function clear(a: { x: number; z: number }, b: { x: number; z: number }) {
  // 경유점이 모서리에 딱 붙어 있으므로 검사할 때는 살짝 덜 넓힘
  return !world.boxes.some((bx) => segmentHitsBox(a.x, a.z, b.x, b.z, bx, PLAYER_RADIUS - 0.02))
}

function insideBounds(p: { x: number; z: number }) {
  const bd = world.bounds
  if (bd.kind === 'circle') return Math.hypot(p.x, p.z) < bd.r - PLAYER_RADIUS
  return p.x > bd.minX + PLAYER_RADIUS && p.x < bd.maxX - PLAYER_RADIUS && p.z > bd.minZ + PLAYER_RADIUS && p.z < bd.maxZ - PLAYER_RADIUS
}

/** 시작→목표가 막혀 있으면 모서리 경유점 목록을 돌려줌 (다익스트라, 노드는 수십 개 수준) */
function planPath(from: { x: number; z: number }, to: { x: number; z: number }): { x: number; z: number }[] {
  if (world.boxes.length === 0 || clear(from, to)) return []
  const nodes: { x: number; z: number }[] = [from, to]
  for (const b of world.boxes) {
    for (const [x, z] of [
      [b.minX - PATH_PAD, b.minZ - PATH_PAD],
      [b.maxX + PATH_PAD, b.minZ - PATH_PAD],
      [b.minX - PATH_PAD, b.maxZ + PATH_PAD],
      [b.maxX + PATH_PAD, b.maxZ + PATH_PAD],
    ]) {
      const c = { x, z }
      const blocked = world.boxes.some((o) => c.x > o.minX - PLAYER_RADIUS && c.x < o.maxX + PLAYER_RADIUS && c.z > o.minZ - PLAYER_RADIUS && c.z < o.maxZ + PLAYER_RADIUS)
      if (!blocked && insideBounds(c)) nodes.push(c)
    }
  }
  const n = nodes.length
  const dist = new Array(n).fill(Infinity)
  const prev = new Array(n).fill(-1)
  const done = new Array(n).fill(false)
  dist[0] = 0
  for (let k = 0; k < n; k++) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i
    if (u < 0 || dist[u] === Infinity) break
    if (u === 1) break
    done[u] = true
    for (let v = 0; v < n; v++) {
      if (done[v] || v === u) continue
      const w = Math.hypot(nodes[u].x - nodes[v].x, nodes[u].z - nodes[v].z)
      if (dist[u] + w < dist[v] && clear(nodes[u], nodes[v])) {
        dist[v] = dist[u] + w
        prev[v] = u
      }
    }
  }
  if (prev[1] < 0) return [] // 길이 없으면 그냥 직진 (미끄러지며 감)
  const path: { x: number; z: number }[] = []
  for (let v = prev[1]; v > 0; v = prev[v]) path.unshift(nodes[v])
  return path
}

// ---------- 명령 ----------
function standUp() {
  if (player.mode !== 'sit') return
  const s = player.seat
  // 벤치·의자는 앞자리로 일어서고, 잔디는 그 자리에서 일어남
  if (s && s.yaw !== null) player.position.set(s.front.x, 0, s.front.z)
  player.mode = 'idle'
  player.pose = 'stand'
  player.seat = null
}

/** 잔디밭에서 가장 가까운 앉을 곳 (안에 있으면 지금 자리) */
function lawnSeat(): Seat | null {
  const lawn = world.lawn
  if (!lawn) return null
  const p = player.position
  const u = Math.hypot(p.x / lawn.rx, p.z / lawn.rz)
  const k = u < 0.92 ? 1 : 0.85 / u
  const x = p.x * k
  const z = p.z * k
  return { x, z, yaw: null, front: { x, z }, lift: GROUND_SIT_LIFT }
}

/**
 * 바닥 클릭: 그 지점으로 걸어감 (달리기·앉기·하늘 보기는 풀림).
 * interact 를 주면 그 지점 반경 안에 들어왔을 때 onArrive 를 실행 (이미 가까우면 바로 실행).
 */
export function walkTo(point: { x: number; z: number }, interact?: Interact) {
  standUp()
  player.bowTime = 0
  player.skyLook = false
  player.interact = interact ?? null
  if (interact && Math.hypot(player.position.x - interact.x, player.position.z - interact.z) < interact.radius) {
    player.interact = null
    player.target = null
    player.mode = 'idle'
    emitUi()
    interact.onArrive()
    return new THREE.Vector3(player.position.x, 0, player.position.z)
  }
  const t = new THREE.Vector3(point.x, 0, point.z)
  resolveCollisions(t, 0.05)
  player.target = t
  player.path = planPath(player.position, t)
  player.mode = 'walk'
  player.stuckTime = 0
  emitUi()
  return t
}

/** 인사하기: 대상 쪽을 보고 고개를 숙임 */
export function bow(toward?: { x: number; z: number }) {
  standUp()
  player.mode = 'idle'
  player.target = null
  player.interact = null
  player.skyLook = false
  if (toward) player.yaw = Math.atan2(toward.x - player.position.x, toward.z - player.position.z)
  player.bowTime = 1.4
  emitUi()
}

/** 뛰기 ↔ 멈추기 */
export function toggleRun() {
  player.interact = null
  player.bowTime = 0
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

/** 앉기(가장 가까운 벤치·의자·잔디로 걸어가서 앉음) ↔ 일어나기 */
export function toggleSit() {
  player.interact = null
  player.bowTime = 0
  if (player.mode === 'sit' || player.mode === 'toSeat') {
    if (player.mode === 'sit') standUp()
    else player.mode = 'idle'
    player.target = null
    player.seat = null
    emitUi()
    return
  }
  const candidates: Seat[] = [...(world.seats ?? [])]
  const lawn = lawnSeat()
  if (lawn) candidates.push(lawn)
  if (candidates.length === 0) return
  let best = candidates[0]
  let bestD = Infinity
  for (const c of candidates) {
    const d = Math.hypot(c.front.x - player.position.x, c.front.z - player.position.z)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  player.seat = best
  player.target = new THREE.Vector3(best.front.x, 0, best.front.z)
  player.path = planPath(player.position, best.front)
  player.mode = 'toSeat'
  player.skyLook = false
  player.stuckTime = 0
  emitUi()
}

/** 하늘 보기 ↔ 원래대로. 걷거나 뛰던 중이면 멈춰 서서 봄 (앉아 있으면 앉은 채로) */
export function toggleSky() {
  if (player.skyLook) {
    player.skyLook = false
  } else {
    if (player.mode === 'walk' || player.mode === 'run' || player.mode === 'toSeat') {
      player.mode = 'idle'
      player.target = null
      player.interact = null
    }
    player.skyLook = true
  }
  emitUi()
}

// ---------- 매 프레임 ----------
const runTarget = new THREE.Vector3()

export function updatePlayer(rawDt: number) {
  // 느린 기기에서도 이동 속도가 크게 줄지 않도록 한 프레임 최대 0.1초까지 반영
  const dt = Math.min(rawDt, 0.1)
  const p = player.position

  if (player.mode === 'sit') {
    // 좌석으로 살짝 미끄러지듯 자리 잡기
    const s = player.seat
    if (s) {
      const k = 1 - Math.exp(-8 * dt)
      p.x += (s.x - p.x) * k
      p.z += (s.z - p.z) * k
      if (s.yaw !== null) player.yaw = lerpAngle(player.yaw, s.yaw, k)
      player.sitLift = s.lift
    }
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
    if (player.bowTime > 0) {
      player.bowTime -= dt
      player.pose = 'bow'
    } else {
      player.pose = 'stand'
    }
    return
  }

  // 경유점이 있으면 먼저 그쪽으로 (가까워지면 다음 경유점)
  let goal: { x: number; z: number } = target
  if (player.mode !== 'run') {
    while (player.path.length && Math.hypot(player.path[0].x - p.x, player.path[0].z - p.z) < 0.25) player.path.shift()
    if (player.path.length) goal = player.path[0]
  }
  const dx = goal.x - p.x
  const dz = goal.z - p.z
  const dist = Math.hypot(dx, dz)
  if (player.mode !== 'run' && !player.path.length && dist < ARRIVE_EPS) {
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
    // 바퀴 수는 운동장에서만 셈
    if (world.countLaps) addDistance(moved)
  }
  player.pose = player.mode === 'run' ? 'run' : 'walk'

  // 문·NPC 같은 목적지 반경 안에 들어오면 멈추고 실행
  const it = player.interact
  if (it && Math.hypot(p.x - it.x, p.z - it.z) < it.radius) {
    player.interact = null
    stop()
    it.onArrive()
    return
  }

  // 걷다가 장애물에 막혀 거의 못 움직이면 멈춤
  if (player.mode !== 'run') {
    if (moved < step * 0.2) {
      player.stuckTime += dt
      if (player.stuckTime > 0.4) {
        if (player.mode === 'toSeat' || player.interact) arrive()
        else stop()
      }
    } else {
      player.stuckTime = 0
    }
  }
}

function arrive() {
  player.path = []
  // 막혀서 멈췄더라도 목적지 근처면 상호작용 실행
  const it = player.interact
  player.interact = null
  if (it && Math.hypot(player.position.x - it.x, player.position.z - it.z) < it.radius * 1.8) {
    stop()
    it.onArrive()
    return
  }
  if (player.mode === 'toSeat') {
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
  player.path = []
  player.mode = 'idle'
  player.pose = 'stand'
  player.target = null
  emitUi()
}

// 개발 중 확인용 (배포 빌드에는 들어가지 않음)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  Object.assign(window, { __player: player, __addDistance: addDistance, __walkTo: walkTo })
}
