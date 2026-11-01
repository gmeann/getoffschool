/** 시간대별 하늘·조명 값. 시각(0~24시)에 따라 아래 키프레임을 부드럽게 섞어서 씀 */

export type TimeName = 'morning' | 'day' | 'evening' | 'night'

export type Palette = {
  skyTop: string
  skyMid: string
  skyBottom: string
  fog: string
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  ambient: string
  ambientIntensity: number
  sun: string
  sunIntensity: number
  sunPos: [number, number, number]
  /** 가로등 밝기 배율 (0 = 꺼짐) */
  lamp: number
  /** 별 보이는 정도 0~1 */
  stars: number
  /** 바닥 흙색, 트랙 안쪽 흙색 */
  ground: string
  field: string
}

export const PALETTES: Record<TimeName, Palette> = {
  // 오전: 맑고 연한 하늘
  morning: {
    skyTop: '#5f9de6',
    skyMid: '#b3d4ef',
    skyBottom: '#f7dcc0',
    fog: '#e8ddd2',
    hemiSky: '#dbe9ff',
    hemiGround: '#7a6a72',
    hemiIntensity: 1.7,
    ambient: '#ffffff',
    ambientIntensity: 0.45,
    sun: '#fff1d6',
    sunIntensity: 2.4,
    sunPos: [20, 12, 12],
    lamp: 0,
    stars: 0,
    ground: '#7a6660',
    field: '#87726b',
  },
  // 낮: 쨍한 파란 하늘
  day: {
    skyTop: '#3b7dd6',
    skyMid: '#7db5ea',
    skyBottom: '#d5eaf6',
    fog: '#c9dfee',
    hemiSky: '#e4f0ff',
    hemiGround: '#7d6c70',
    hemiIntensity: 1.9,
    ambient: '#ffffff',
    ambientIntensity: 0.5,
    sun: '#fffaf0',
    sunIntensity: 2.8,
    sunPos: [6, 30, 10],
    lamp: 0,
    stars: 0,
    ground: '#84716a',
    field: '#927e75',
  },
  // 저녁: 1단계의 노을
  evening: {
    skyTop: '#4b3f7a',
    skyMid: '#d9777f',
    skyBottom: '#f7b777',
    fog: '#d98a85',
    hemiSky: '#c9b3f0',
    hemiGround: '#6a4a6a',
    hemiIntensity: 1.6,
    ambient: '#9a86cf',
    ambientIntensity: 0.6,
    sun: '#ffb070',
    sunIntensity: 2.6,
    sunPos: [-18, 10, 14],
    lamp: 1,
    stars: 0.35,
    ground: '#5b4763',
    field: '#665170',
  },
  // 밤: 짙은 남색 + 별, 가로등 더 밝게
  night: {
    skyTop: '#070b24',
    skyMid: '#141b45',
    skyBottom: '#2c2c5c',
    fog: '#1c2046',
    hemiSky: '#5a6aa8',
    hemiGround: '#2a2440',
    hemiIntensity: 0.9,
    ambient: '#5c6bb0',
    ambientIntensity: 0.45,
    sun: '#a9b8ff',
    sunIntensity: 0.6,
    sunPos: [12, 20, -8],
    lamp: 2.2,
    stars: 1,
    ground: '#4f4766',
    field: '#5a5174',
  },
}

/** [시각, 시간대] 키프레임. 사이 구간은 부드럽게 섞임 */
export const KEYFRAMES: [number, TimeName][] = [
  [0, 'night'],
  [5, 'night'],
  [7, 'morning'],
  [10, 'morning'],
  [12, 'day'],
  [15.5, 'day'],
  [17.5, 'evening'],
  [19, 'evening'],
  [20.5, 'night'],
  [24, 'night'],
]

/** ?time=morning 처럼 강제로 바꿀 때 쓰는 대표 시각 */
export const FORCED_HOURS: Record<TimeName, number> = {
  morning: 8.5,
  day: 13.5,
  evening: 18.2,
  night: 22,
}

/** 현재 시각에 해당하는 시간대 이름 (UI 표시용) */
export function timeNameOf(hour: number): TimeName {
  if (hour >= 6 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 16.5) return 'day'
  if (hour >= 16.5 && hour < 19.75) return 'evening'
  return 'night'
}

export const TIME_LABEL: Record<TimeName, string> = {
  morning: '오전',
  day: '낮',
  evening: '저녁',
  night: '밤',
}
