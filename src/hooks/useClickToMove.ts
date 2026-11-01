import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OBSTACLES, WORLD_RADIUS, type Circle } from '../data/world'

const WALK_SPEED = 2.8 // m/s
const TURN_SPEED = 10 // 클수록 빨리 돎
const PLAYER_RADIUS = 0.35
const ARRIVE_EPS = 0.06

export type MoveState = {
  position: THREE.Vector3
  yaw: number
  target: THREE.Vector3 | null
  moving: boolean
}

/** 원형 장애물과 경계 밖으로 밀어내기 */
function resolveCollisions(p: THREE.Vector3, obstacles: Circle[], extra = 0) {
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

/**
 * 바닥 클릭 → 목표 지점으로 부드럽게 걸어가기.
 * 상태는 ref 로만 관리해서 매 프레임 리렌더가 없도록 함.
 */
export function useClickToMove(start: { x: number; z: number }) {
  const state = useRef<MoveState>({
    position: new THREE.Vector3(start.x, 0, start.z),
    yaw: 0,
    target: null,
    moving: false,
  })
  const stuckTime = useRef(0)

  const setTarget = (point: THREE.Vector3) => {
    const t = new THREE.Vector3(point.x, 0, point.z)
    // 장애물 안을 찍었으면 가장자리로 옮김
    resolveCollisions(t, OBSTACLES, 0.05)
    state.current.target = t
    stuckTime.current = 0
    return t
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = state.current
    if (!s.target) {
      s.moving = false
      return
    }
    const p = s.position
    const dx = s.target.x - p.x
    const dz = s.target.z - p.z
    const dist = Math.hypot(dx, dz)
    if (dist < ARRIVE_EPS) {
      s.target = null
      s.moving = false
      return
    }
    const step = Math.min(dist, WALK_SPEED * dt)
    const prevX = p.x
    const prevZ = p.z
    p.x += (dx / dist) * step
    p.z += (dz / dist) * step
    resolveCollisions(p, OBSTACLES)

    // 실제로 움직인 방향으로 몸을 돌림 (장애물을 미끄러지듯 돌아갈 때도 자연스럽게)
    const mx = p.x - prevX
    const mz = p.z - prevZ
    const moved = Math.hypot(mx, mz)
    if (moved > 0.0005) {
      s.yaw = lerpAngle(s.yaw, Math.atan2(mx, mz), 1 - Math.exp(-TURN_SPEED * dt))
    }

    // 장애물에 막혀 거의 못 움직이면 잠시 후 멈춤
    if (moved < step * 0.2) {
      stuckTime.current += dt
      if (stuckTime.current > 0.4) {
        s.target = null
      }
    } else {
      stuckTime.current = 0
    }
    s.moving = s.target !== null
  })

  return { state, setTarget }
}
