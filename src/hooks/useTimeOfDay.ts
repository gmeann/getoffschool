import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { FORCED_HOURS, KEYFRAMES, PALETTES, timeNameOf, type Palette, type TimeName } from '../data/timeOfDay'

/** 섞인 결과: 색은 THREE.Color 로 미리 만들어 둠 */
export type Sky = {
  hour: number
  name: TimeName
  skyTop: THREE.Color
  skyMid: THREE.Color
  skyBottom: THREE.Color
  fog: THREE.Color
  hemiSky: THREE.Color
  hemiGround: THREE.Color
  hemiIntensity: number
  ambient: THREE.Color
  ambientIntensity: number
  sun: THREE.Color
  sunIntensity: number
  sunPos: [number, number, number]
  lamp: number
  stars: number
  ground: THREE.Color
  field: THREE.Color
}

const COLOR_KEYS = ['skyTop', 'skyMid', 'skyBottom', 'fog', 'hemiSky', 'hemiGround', 'ambient', 'sun', 'ground', 'field'] as const
const NUM_KEYS = ['hemiIntensity', 'ambientIntensity', 'sunIntensity', 'lamp', 'stars'] as const

/** URL 의 ?time= 값 읽기. morning/day/evening/night 또는 0~24 숫자 */
function forcedHour(): number | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('time')
  if (!v) return null
  if (v in FORCED_HOURS) return FORCED_HOURS[v as TimeName]
  const n = Number(v)
  return Number.isFinite(n) ? ((n % 24) + 24) % 24 : null
}

function currentHour() {
  const f = forcedHour()
  if (f !== null) return f
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

/** 지금 시간대 이름 (소리 분위기용) */
export function currentTimeName(): TimeName {
  return timeNameOf(currentHour())
}

export function skyAt(hour: number): Sky {
  let i = 0
  while (i < KEYFRAMES.length - 2 && hour >= KEYFRAMES[i + 1][0]) i++
  const [h0, n0] = KEYFRAMES[i]
  const [h1, n1] = KEYFRAMES[i + 1]
  const raw = h1 === h0 ? 0 : (hour - h0) / (h1 - h0)
  const t = THREE.MathUtils.smoothstep(raw, 0, 1)
  const a: Palette = PALETTES[n0]
  const b: Palette = PALETTES[n1]

  const out = { hour, name: timeNameOf(hour) } as Sky
  for (const k of COLOR_KEYS) {
    out[k] = new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t)
  }
  for (const k of NUM_KEYS) {
    out[k] = a[k] + (b[k] - a[k]) * t
  }
  out.sunPos = a.sunPos.map((v, j) => v + (b.sunPos[j] - v) * t) as [number, number, number]
  return out
}

/** 기기 시각(또는 ?time=)에 맞는 하늘. 30초마다 다시 계산해서 천천히 바뀜 */
export function useTimeOfDay(): Sky {
  const [sky, setSky] = useState(() => skyAt(currentHour()))
  useEffect(() => {
    const id = window.setInterval(() => setSky(skyAt(currentHour())), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return sky
}
