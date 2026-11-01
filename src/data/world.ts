/** 운동장 배치 데이터. 위치 단위는 m, 바닥은 y = 0 평면. */

export type Circle = { x: number; z: number; r: number }

/** 캐릭터가 걸어 다닐 수 있는 원형 경계 */
export const WORLD_RADIUS = 34

/** 달리기 트랙 (타원). rx, rz 는 바깥 반지름, width 는 트랙 폭 */
export const TRACK = { rx: 15, rz: 9, width: 2.2 }

/** 캐릭터 시작 위치 (트랙 아래쪽) */
export const PLAYER_START = { x: 0, z: 8 }

/** 나무: x, z, 크기 배율 */
export const TREES: { x: number; z: number; s: number }[] = [
  { x: -21, z: -6, s: 1.1 },
  { x: -23, z: 3, s: 0.9 },
  { x: -19, z: 11, s: 1.0 },
  { x: 21, z: -8, s: 1.2 },
  { x: 23, z: 2, s: 0.85 },
  { x: 7, z: -15, s: 1.0 },
  { x: -8, z: -16, s: 1.15 },
  { x: 14, z: 14, s: 0.95 },
]

/** 가로등: x, z (앞의 두 개만 실제 pointLight 를 가짐) */
export const LAMPS: { x: number; z: number }[] = [
  { x: -6, z: 12 },
  { x: 10, z: 12 },
  { x: 0, z: -12 },
]

/** 벤치: 위치와 회전 (y축) */
export const BENCH = { x: 3, z: 12.5, rotY: 0 }

/** 통과할 수 없는 원형 충돌 영역 */
export const OBSTACLES: Circle[] = [
  ...TREES.map((t) => ({ x: t.x, z: t.z, r: 0.9 * t.s })),
  ...LAMPS.map((l) => ({ x: l.x, z: l.z, r: 0.35 })),
  { x: BENCH.x, z: BENCH.z, r: 1.3 },
]

/** 우상단 "오늘 N명" (지금은 임의의 고정 숫자) */
export const TODAY_VISITORS = 27
