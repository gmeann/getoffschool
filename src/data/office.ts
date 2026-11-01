/** 교무실 배치 데이터. 방은 x -9~9, z -7~7, 천장 높이 3.2m */
import type { Box, Circle, World } from './world'

export const ROOM = { minX: -9, maxX: 9, minZ: -7, maxZ: 7, height: 3.2 }

/** 책상 (x, z, 앉는 사람이 바라보는 방향 rotY, 크기 배율) */
export type Desk = { x: number; z: number; rotY: number; s?: number }

/** 마주 보는 책상 4개씩 두 섬 = 8개 */
function island(cx: number, cz: number): Desk[] {
  return [
    { x: cx - 0.76, z: cz - 0.38, rotY: Math.PI },
    { x: cx + 0.76, z: cz - 0.38, rotY: Math.PI },
    { x: cx - 0.76, z: cz + 0.38, rotY: 0 },
    { x: cx + 0.76, z: cz + 0.38, rotY: 0 },
  ]
}
export const ISLANDS = [
  { x: -3.2, z: -0.6 },
  { x: 2.6, z: -0.6 },
]
export const DESKS: Desk[] = [
  ...ISLANDS.flatMap((i) => island(i.x, i.z)),
  // 교감선생님 책상 (뒤쪽 가운데, 조금 큼)
  { x: 0, z: -5.0, rotY: 0, s: 1.25 },
]

/** 책상 앞 의자 위치 (책상에서 앉는 쪽으로 0.62m) */
export function chairOf(d: Desk) {
  const k = 0.62 * (d.s ?? 1)
  return { x: d.x - Math.sin(d.rotY) * k, z: d.z - Math.cos(d.rotY) * k, rotY: d.rotY }
}

export const CABINETS = [
  { x: 5.3, z: -6.65 },
  { x: 6.3, z: -6.65 },
  { x: 7.3, z: -6.65 },
]
export const WATER = { x: -8.3, z: -6.3 }
export const PLANTS = [
  { x: 8.3, z: -6.2 },
  { x: 8.3, z: 6.2 },
  { x: -8.3, z: 6.2 },
]
/** 뒤쪽 벽 창문 (x 중심) */
export const WINDOWS = [-4.6, 4.6]
/** 천장 등 (앞의 두 개만 실제 pointLight) */
export const CEILING_LAMPS = [
  { x: -3.2, z: -0.6 },
  { x: 2.6, z: -0.6 },
  { x: 0, z: -5 },
  { x: 0, z: 3.5 },
]

const islandBox = (cx: number, cz: number): Box => ({
  minX: cx - 1.65,
  maxX: cx + 1.65,
  minZ: cz - 1.45,
  maxZ: cz + 1.45,
})

/** NPC 가 서 있는 자리에도 원형 충돌을 둠 (office 장면에서 합침) */
export const OFFICE_BOXES: Box[] = [
  ...ISLANDS.map((i) => islandBox(i.x, i.z)),
  // 교감 책상 + 의자
  { minX: -1.0, maxX: 1.0, minZ: -6.3, maxZ: -4.45 },
  // 서류함
  { minX: 4.8, maxX: 7.8, minZ: -7, maxZ: -6.35 },
]
export const OFFICE_CIRCLES: Circle[] = [{ ...WATER, r: 0.32 }, ...PLANTS.map((p) => ({ ...p, r: 0.38 }))]

export function officeWorld(extra: Circle[]): World {
  return {
    circles: [...OFFICE_CIRCLES, ...extra],
    boxes: OFFICE_BOXES,
    bounds: { kind: 'rect', minX: ROOM.minX + 0.3, maxX: ROOM.maxX - 0.3, minZ: ROOM.minZ + 0.3, maxZ: ROOM.maxZ - 0.3 },
  }
}
