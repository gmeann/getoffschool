/** 운동장 배치 데이터. 위치 단위는 m, 바닥은 y = 0 평면. */

export type Circle = { x: number; z: number; r: number }
/** 축에 나란한 사각형 충돌 영역 */
export type Box = { minX: number; maxX: number; minZ: number; maxZ: number }
/** 장면마다 다른 충돌 정보 */
/**
 * 앉을 수 있는 자리.
 * x,z,yaw: 앉았을 때 위치·방향 (yaw 가 null 이면 지금 바라보는 방향 그대로)
 * front: 걸어가서 멈출 자리, lift: 몸을 올리는 높이 (벤치 0.24, 바닥은 음수)
 */
export type Seat = { x: number; z: number; yaw: number | null; front: { x: number; z: number }; lift: number }

/** 장면마다 다른 충돌·앉을 자리 정보 */
export type World = {
  circles: Circle[]
  boxes: Box[]
  bounds: { kind: 'circle'; r: number } | ({ kind: 'rect' } & Box)
  /** 걸은 거리를 바퀴 수로 셀지 (운동장만) */
  countLaps?: boolean
  seats?: Seat[]
  /** 바닥에 바로 앉을 수 있는 타원 잔디밭 */
  lawn?: { rx: number; rz: number }
}

/** 바닥(잔디)에 앉을 때 몸을 내리는 높이 */
export const GROUND_SIT_LIFT = -0.22

/** 캐릭터가 걸어 다닐 수 있는 원형 경계 */
export const WORLD_RADIUS = 34

/** 달리기 트랙 (타원). rx, rz 는 바깥 반지름, width 는 트랙 폭 */
export const TRACK = { rx: 15, rz: 9, width: 2.2 }

/** 트랙 가운데 레인(달리기·한 바퀴 계산 기준) */
export const LANE = { rx: TRACK.rx - TRACK.width / 2, rz: TRACK.rz - TRACK.width / 2 }

/** 가운데 레인 한 바퀴 길이 (라마누잔 근사식) ≈ 69.8m */
export const LAP_LENGTH = (() => {
  const a = LANE.rx
  const b = LANE.rz
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
})()

/** 타원 위의 점. theta 가 커지는 방향 = 반시계(위에서 볼 때) */
export function lanePoint(theta: number, offset = 0) {
  return { x: (LANE.rx + offset) * Math.cos(theta), z: (LANE.rz + offset) * Math.sin(theta) }
}

/** 타원 둘레 방향 속도 계산용: 각도 1 라디안당 실제 거리 */
export function laneSpeedFactor(theta: number, offset = 0) {
  const a = LANE.rx + offset
  const b = LANE.rz + offset
  return Math.hypot(a * Math.sin(theta), b * Math.cos(theta))
}

/** 점의 타원 각도 */
export function laneAngleOf(x: number, z: number) {
  return Math.atan2(z / LANE.rz, x / LANE.rx)
}

/** 캐릭터 시작 위치 (트랙 아래쪽) */
export const PLAYER_START = { x: 0, z: 8 }

/** 나무: x, z, 크기 배율 */
export const TREES: { x: number; z: number; s: number }[] = [
  { x: -21, z: -6, s: 1.1 },
  { x: -23, z: 3, s: 0.9 },
  { x: -19, z: 11, s: 1.0 },
  { x: 21, z: -8, s: 1.2 },
  { x: 23, z: 2, s: 0.85 },
  { x: 11, z: -14.5, s: 1.0 },
  { x: -15, z: -15, s: 1.15 },
  { x: 14, z: 14, s: 0.95 },
]

/** 가로등: x, z (앞의 두 개만 실제 pointLight 를 가짐) */
export const LAMPS: { x: number; z: number }[] = [
  { x: -6, z: 12 },
  { x: 10, z: 12 },
  { x: 0, z: -12 },
]

/**
 * 벤치 2개. rotY 는 벤치가 바라보는 방향 (0 = +z 방향).
 * 둘 다 트랙 쪽을 바라봄.
 */
export const BENCHES: { x: number; z: number; rotY: number }[] = [
  { x: 3, z: 12.5, rotY: Math.PI },
  { x: -4, z: -12.6, rotY: 0 },
  { x: -17.6, z: 0, rotY: Math.PI / 2 },
  { x: 17.6, z: -1, rotY: -Math.PI / 2 },
  { x: -10, z: 11.6, rotY: Math.PI },
  { x: 9.5, z: -12.2, rotY: 0 },
]

/** 트랙 안쪽 가운데 잔디밭 (타원 반지름). 여기서는 어디든 바닥에 앉을 수 있음 */
export const LAWN = { rx: 10.2, rz: 4.8 }

/** 벤치 좌석 (벤치 기준 좌우 위치). 0번은 그림자 선생님, 1번은 내 자리 */
export const SEAT_X = [-0.5, 0.5]

function benchLocalToWorld(b: (typeof BENCHES)[number], lx: number, lz: number) {
  const c = Math.cos(b.rotY)
  const s = Math.sin(b.rotY)
  return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c }
}

/** 앉았을 때의 위치(좌석)와, 걸어가서 멈출 앞자리 위치 */
export function seatInfo(benchIndex: number, seat: number) {
  const b = BENCHES[benchIndex]
  return {
    seat: benchLocalToWorld(b, SEAT_X[seat], 0.05),
    front: benchLocalToWorld(b, SEAT_X[seat], 1.05),
    yaw: b.rotY,
  }
}

/** 통과할 수 없는 원형 충돌 영역 */
export const OBSTACLES: Circle[] = [
  ...TREES.map((t) => ({ x: t.x, z: t.z, r: 0.9 * t.s })),
  ...LAMPS.map((l) => ({ x: l.x, z: l.z, r: 0.35 })),
  // 벤치 하나를 원 두 개로 덮음
  ...BENCHES.flatMap((b) => [-0.55, 0.55].map((lx) => ({ ...benchLocalToWorld(b, lx, -0.05), r: 0.6 }))),
]

/** 학교 건물 외관 (운동장 북쪽). 정면은 z = BUILDING.z + d/2 */
export const BUILDING = { x: 0, z: -22.5, w: 22, d: 6, h: 6 }

export const BUILDING_BOX: Box = {
  minX: BUILDING.x - BUILDING.w / 2,
  maxX: BUILDING.x + BUILDING.w / 2,
  minZ: BUILDING.z - BUILDING.d / 2,
  maxZ: BUILDING.z + BUILDING.d / 2,
}

export const PLAYGROUND_WORLD: World = {
  circles: OBSTACLES,
  boxes: [BUILDING_BOX],
  bounds: { kind: 'circle', r: WORLD_RADIUS },
  countLaps: true,
  // 벤치마다 오른쪽 자리(1번)가 내 자리
  seats: BENCHES.map((_, i) => {
    const s = seatInfo(i, 1)
    return { x: s.seat.x, z: s.seat.z, yaw: s.yaw, front: s.front, lift: 0.24 }
  }),
  lawn: LAWN,
}

/** 우상단 "오늘 N명" (지금은 임의의 고정 숫자) */
export const TODAY_VISITORS = 27

/** 그림자 선생님이 말을 거는 거리(m) */
export const TALK_DISTANCE = 2.4
