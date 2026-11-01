/** 교실 배치 데이터. 방은 x -9~9, z -7~7 (교무실과 같은 크기), 칠판은 앞쪽(z = -7) 벽 */
import type { Box, Circle, World } from './world'

export const CLASS_ROOM = { minX: -9, maxX: 9, minZ: -7, maxZ: 7, height: 3.2 }

export const BLACKBOARD = { x: 0, y: 1.72, z: CLASS_ROOM.minZ, w: 7, h: 1.5 }

/** 학생 책상 16세트: 4열 × 4줄, 모두 칠판(-z)을 바라봄. 의자는 책상 뒤(+z) */
export const STUDENT_COLS = [-4.5, -1.5, 1.5, 4.5]
export const STUDENT_ROWS = [-2.6, -0.8, 1.0, 2.8]
export const STUDENT_DESKS = STUDENT_ROWS.flatMap((z) => STUDENT_COLS.map((x) => ({ x, z })))

/** 교탁 */
export const LECTERN = { x: 0, z: -5.4 }
/** 내 업무 책상 (교탁 옆), 서류 더미 위치 */
export const MY_DESK = { x: 4.3, z: -5.5 }
export const PILE = { x: 4.65, y: 0.77, z: -5.45 }
/** 서류 한 장 두께 (남은 장수만큼 더미 높이가 바뀜) */
export const SHEET_THICKNESS = 0.012
/** 파쇄기 (내 책상 옆 구석) */
export const SHREDDER = { x: 6.45, z: -6.35, h: 0.8 }
/** 왼쪽 벽 큰 창문 3개 (z 중심). 가운데 창문이 열려 있어 종이비행기가 나감 */
export const CLASS_WINDOWS = [-4.2, -0.6, 3.0]
export const OPEN_WINDOW_Z = -0.6
/** 오른쪽 벽 뒤쪽: 사물함 + 게시판 */
export const LOCKERS = { x: CLASS_ROOM.maxX - 0.3, z1: 1.2, z2: 6.4, h: 1.2, d: 0.6 }
export const CLASS_PLANTS = [
  { x: -8.35, z: -6.3 },
  { x: -8.35, z: 1.2 },
  { x: -8.35, z: 6.3 },
]
/** 형광등 모양 6개 (빛은 pointLight 2개만) */
export const CLASS_LAMPS = [-3.5, 0, 3.5].flatMap((x) => [-2.2, 2.2].map((z) => ({ x, z })))

const deskBox = (d: { x: number; z: number }): Box => ({ minX: d.x - 0.4, maxX: d.x + 0.4, minZ: d.z - 0.3, maxZ: d.z + 0.75 })

export const CLASS_BOXES: Box[] = [
  ...STUDENT_DESKS.map(deskBox),
  { minX: LECTERN.x - 0.6, maxX: LECTERN.x + 0.6, minZ: LECTERN.z - 0.35, maxZ: LECTERN.z + 0.35 },
  { minX: MY_DESK.x - 0.8, maxX: MY_DESK.x + 0.8, minZ: MY_DESK.z - 0.95, maxZ: MY_DESK.z + 0.4 },
  { minX: SHREDDER.x - 0.3, maxX: SHREDDER.x + 0.3, minZ: SHREDDER.z - 0.25, maxZ: SHREDDER.z + 0.25 },
  { minX: LOCKERS.x - LOCKERS.d / 2, maxX: CLASS_ROOM.maxX, minZ: LOCKERS.z1, maxZ: LOCKERS.z2 },
]
export const CLASS_CIRCLES: Circle[] = CLASS_PLANTS.map((p) => ({ ...p, r: 0.38 }))

export const CLASSROOM_WORLD: World = {
  circles: CLASS_CIRCLES,
  boxes: CLASS_BOXES,
  bounds: {
    kind: 'rect',
    minX: CLASS_ROOM.minX + 0.3,
    maxX: CLASS_ROOM.maxX - 0.3,
    minZ: CLASS_ROOM.minZ + 0.3,
    maxZ: CLASS_ROOM.maxZ - 0.3,
  },
}
