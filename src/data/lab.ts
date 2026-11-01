/** 연구실 배치 데이터. 방은 x -9~9, z -7~7 (다른 실내와 같은 크기) */
import type { BoardId } from './boards'
import type { Box, Circle, World } from './world'

export const LAB_ROOM = { minX: -9, maxX: 9, minZ: -7, maxZ: 7, height: 3.2 }

/** 상호작용 오브젝트 3개: 위치, 바라보는 방향, 걸어가 설 자리 */
export type LabObject = { board: BoardId; x: number; y: number; z: number; rotY: number; front: { x: number; z: number } }
export const LAB_OBJECTS: Record<BoardId, LabObject> = {
  // 칠판: 뒤쪽 벽 왼편
  chalk: { board: 'chalk', x: -2.6, y: 1.75, z: LAB_ROOM.minZ, rotY: 0, front: { x: -2.6, z: -5.6 } },
  // 메모보드: 왼쪽 벽 가운데
  memo: { board: 'memo', x: LAB_ROOM.minX, y: 1.7, z: -0.8, rotY: Math.PI / 2, front: { x: -7.7, z: -0.8 } },
  // 냉장고: 오른쪽 벽 (문이 방 쪽을 봄)
  fridge: { board: 'fridge', x: 8.55, y: 0, z: -2.6, rotY: -Math.PI / 2, front: { x: 7.25, z: -2.6 } },
}

export const BOOKSHELVES = [
  { x: 3.0, z: LAB_ROOM.minZ + 0.25 },
  { x: 5.3, z: LAB_ROOM.minZ + 0.25 },
]
export const WORK_TABLE = { x: 0, z: 0.9, w: 3.6, d: 1.6 }
export const LAB_CHAIRS = [
  { x: -0.9, z: WORK_TABLE.z - 1.15, rotY: 0 },
  { x: 0.9, z: WORK_TABLE.z - 1.15, rotY: 0 },
  { x: -0.9, z: WORK_TABLE.z + 1.15, rotY: Math.PI },
  { x: 0.9, z: WORK_TABLE.z + 1.15, rotY: Math.PI },
]
export const LAB_WINDOWS = [-4.6, 3.8]
export const LAB_PLANTS = [
  { x: -8.3, z: 6.2 },
  { x: 8.3, z: 6.2 },
  { x: -8.3, z: -6.3 },
  { x: 1.4, z: -6.4 },
]
export const LAB_LAMPS = [
  { x: -2.4, z: -2.6 },
  { x: 2.2, z: 1.2 },
  { x: -1, z: 4.6 },
]

export const LAB_BOXES: Box[] = [
  { minX: 1.8, maxX: 6.5, minZ: LAB_ROOM.minZ, maxZ: LAB_ROOM.minZ + 0.55 },
  { minX: WORK_TABLE.x - 1.95, maxX: WORK_TABLE.x + 1.95, minZ: WORK_TABLE.z - 1.5, maxZ: WORK_TABLE.z + 1.5 },
  { minX: 8.1, maxX: LAB_ROOM.maxX, minZ: -3.05, maxZ: -2.15 },
]
export const LAB_CIRCLES: Circle[] = LAB_PLANTS.map((p) => ({ ...p, r: 0.38 }))

export const LAB_WORLD: World = {
  circles: LAB_CIRCLES,
  boxes: LAB_BOXES,
  bounds: { kind: 'rect', minX: LAB_ROOM.minX + 0.3, maxX: LAB_ROOM.maxX - 0.3, minZ: LAB_ROOM.minZ + 0.3, maxZ: LAB_ROOM.maxZ - 0.3 },
}
