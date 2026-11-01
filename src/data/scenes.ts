/**
 * 공간(장면) 정의를 한곳에서 관리.
 * 새 공간을 추가할 때는 여기에 항목을 넣고, scenes/ 폴더에 장면 컴포넌트를 만든 뒤
 * App 의 SCENE_COMPONENTS 에 연결하면 됩니다.
 */

export type SceneId = 'playground' | 'office' | 'classroom' | 'lab'

/** 하단 알약 버튼 종류 */
export type ActionId = 'run' | 'sit' | 'sky' | 'book' | 'greet' | 'fling' | 'method' | 'add' | 'memo' | 'fridge' | 'chalk'

export type Spawn = { x: number; z: number; yaw: number }

export type Door = {
  id: string
  label: string
  /** 문 중심 (바닥 기준) */
  x: number
  z: number
  /** 문이 바라보는 방향 (0 = +z). 캐릭터는 이 방향 앞쪽에 섬 */
  yaw: number
  to: SceneId
}

export type SceneDef = {
  id: SceneId
  name: string
  ready: boolean
  background: string
  /** 처음 들어올 때 위치 */
  spawn: Spawn
  /** 특정 공간에서 넘어올 때의 위치 (예: 교무실에서 나오면 건물 앞) */
  spawnFrom?: Partial<Record<SceneId, Spawn>>
  doors: Door[]
  actions: ActionId[]
  /** 카메라 거리 배율 (실내는 조금 가깝게) */
  cameraScale?: number
}

export const SCENES: Record<SceneId, SceneDef> = {
  playground: {
    id: 'playground',
    name: '운동장',
    ready: true,
    background: '#d9777f',
    spawn: { x: 0, z: 8, yaw: 0 },
    spawnFrom: {
      office: { x: -6, z: -17.6, yaw: 0 },
      classroom: { x: 0, z: -17.6, yaw: 0 },
      lab: { x: 6, z: -17.6, yaw: 0 },
    },
    // 학교 건물 정면(z = -19.5)의 문 3개
    doors: [
      { id: 'office', label: '교무실', x: -6, z: -19.5, yaw: 0, to: 'office' },
      { id: 'classroom', label: '교실', x: 0, z: -19.5, yaw: 0, to: 'classroom' },
      { id: 'lab', label: '연구실', x: 6, z: -19.5, yaw: 0, to: 'lab' },
    ],
    actions: ['run', 'sit', 'sky'],
  },
  office: {
    id: 'office',
    name: '교무실',
    ready: true,
    background: '#2e2420',
    spawn: { x: -7.4, z: 3.2, yaw: Math.PI / 2 },
    // 왼쪽 벽의 출입문
    doors: [{ id: 'exit', label: '운동장으로', x: -9, z: 3.2, yaw: Math.PI / 2, to: 'playground' }],
    actions: ['book', 'greet'],
    cameraScale: 0.82,
  },
  classroom: {
    id: 'classroom',
    name: '교실',
    ready: true,
    background: '#2e2420',
    spawn: { x: 7.4, z: -3.2, yaw: -Math.PI / 2 },
    // 오른쪽 벽 앞쪽의 출입문
    doors: [{ id: 'exit', label: '운동장으로', x: 9, z: -3.2, yaw: -Math.PI / 2, to: 'playground' }],
    actions: ['fling', 'method', 'add', 'sit'],
    cameraScale: 0.8,
  },
  lab: {
    id: 'lab',
    name: '연구실',
    ready: true,
    background: '#2e2420',
    spawn: { x: 7.4, z: 3.5, yaw: -Math.PI / 2 },
    // 오른쪽 벽 앞쪽의 출입문
    doors: [{ id: 'exit', label: '운동장으로', x: 9, z: 3.5, yaw: -Math.PI / 2, to: 'playground' }],
    actions: ['memo', 'fridge', 'chalk'],
    cameraScale: 0.82,
  },
}

/** 공간 목록 표시 순서 */
export const SCENE_ORDER: SceneId[] = ['playground', 'office', 'classroom', 'lab']

/** 문 앞에 서는 위치 */
export function doorFront(d: Door, dist = 1.0) {
  return { x: d.x + Math.sin(d.yaw) * dist, z: d.z + Math.cos(d.yaw) * dist }
}
