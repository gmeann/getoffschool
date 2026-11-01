import { useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { NICKNAMES } from '../data/nicknames'
import { pickShadowLine } from '../data/shadowLines'
import { BENCHES, LANE, TALK_DISTANCE, laneSpeedFactor, lanePoint, seatInfo } from '../data/world'
import { player } from '../hooks/playerStore'
import { CharacterModel, animateBody, newAnim, useBodyRefs, type Look } from './CharacterModel'

type Spec = {
  name: string
  kind: 'walk' | 'run' | 'sit'
  speed: number // m/s
  theta: number // 트랙 위 시작 각도
  offset: number // 레인 안쪽/바깥쪽 치우침
  bench: number
  look: Look
}

/** 산책하는 선생님 옷차림: 차분한 파스텔 카디건 + 다양한 머리색 (불투명, 형태가 또렷하게) */
const TOPS = ['#9fd3c7', '#b8a9e3', '#f4a6a6', '#a7c7e7', '#f6d186', '#c7d9a7', '#e8b4d0', '#d9c2a6']
const PANTS = ['#4d4a6b', '#5a5f73', '#6b5b4f', '#3f4a5c']
const HAIRS = ['#3b2a2a', '#5a3d2b', '#2a2a35', '#7a5a45', '#4a3a3a']
const SHOES = ['#e9e4da', '#c9d7e8', '#f0d3c0', '#cfe3d0']
const SKINS = ['#f6c7a1', '#f1bf96', '#f8d0b0']
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

const BUBBLE_SECONDS = 3
const COOLDOWN_SECONDS = 10
/** 여러 그림자가 동시에 말하지 않게 하는 전체 간격 */
const GLOBAL_GAP = 1.2
let globalNextTalk = 0

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** 접속할 때마다 인원·속도·위치가 조금씩 달라짐 */
function makeSpecs(myName: string, lowSpec = false): Spec[] {
  // 저사양 모드에서는 3~4명
  const count = lowSpec ? 3 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 3) // 6~8명
  const sitters = Math.min(BENCHES.length, 1 + Math.floor(Math.random() * 3)) // 1~3명
  const names = NICKNAMES.filter((n) => n !== myName).sort(() => Math.random() - 0.5)
  const benchOrder = BENCHES.map((_, i) => i).sort(() => Math.random() - 0.5)
  return Array.from({ length: count }, (_, i) => {
    const sit = i < sitters
    const run = !sit && Math.random() < 0.35
    return {
      name: names[i % names.length],
      kind: sit ? 'sit' : run ? 'run' : 'walk',
      // 설렁설렁 걷기 (0.45~0.8 m/s), 뛰는 사람은 가볍게 조깅
      speed: run ? rand(2.4, 3.3) : rand(0.45, 0.8),
      // 트랙 위에 고르게 흩어 놓고 조금씩 흔듦 (처음부터 뭉치지 않게)
      theta: (i / count) * Math.PI * 2 + rand(-0.3, 0.3),
      offset: rand(-0.7, 0.7),
      bench: sit ? benchOrder[i] : -1,
      look: (() => {
        const top = TOPS[i % TOPS.length]
        return { top, sleeves: top, inner: '#fffaf2', pants: pick(PANTS), shoes: pick(SHOES), hair: pick(HAIRS), skin: pick(SKINS) }
      })(),
    }
  })
}

function ShadowTeacher({ spec, labelLayer }: { spec: Spec; labelLayer: RefObject<HTMLDivElement> }) {
  const root = useRef<THREE.Group>(null)
  const tag = useRef<THREE.Group>(null)
  const refs = useBodyRefs()
  const anim = useRef(newAnim())
  const theta = useRef(spec.theta)
  const talk = useRef({ speaking: false, until: 0, nextAllowed: 0 })
  const [line, setLine] = useState<string | null>(null)

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const g = root.current
    if (!g) return

    if (spec.kind === 'sit') {
      const info = seatInfo(spec.bench, 0)
      g.position.set(info.seat.x, 0, info.seat.z)
      g.rotation.y = info.yaw
      animateBody(refs, anim.current, 'sit', dt)
    } else {
      // 타원 둘레를 일정한 실제 속도로 돌기
      theta.current += (spec.speed * dt) / laneSpeedFactor(theta.current, spec.offset)
      const t = theta.current
      const p = lanePoint(t, spec.offset)
      g.position.set(p.x, 0, p.z)
      // 진행 방향(접선)으로 몸 돌리기
      const a = LANE.rx + spec.offset
      const b = LANE.rz + spec.offset
      g.rotation.y = Math.atan2(-a * Math.sin(t), b * Math.cos(t))
      // 걸음 빠르기를 실제 속도에 맞춰 느긋하게
      const stride = spec.kind === 'run' ? spec.speed / 5.2 : Math.max(0.45, spec.speed / 2.2)
      animateBody(refs, anim.current, spec.kind, dt, stride)
    }
    if (tag.current) tag.current.position.y = 1.62 + anim.current.sit * 0.24

    // 가까이 오면 말 걸기
    const now = state.clock.elapsedTime
    const tk = talk.current
    if (tk.speaking) {
      if (now >= tk.until) {
        tk.speaking = false
        tk.nextAllowed = now + COOLDOWN_SECONDS
        setLine(null)
      }
    } else if (now >= tk.nextAllowed && now >= globalNextTalk) {
      const d = Math.hypot(player.position.x - g.position.x, player.position.z - g.position.z)
      if (d < TALK_DISTANCE) {
        tk.speaking = true
        tk.until = now + BUBBLE_SECONDS
        globalNextTalk = now + GLOBAL_GAP
        setLine(pickShadowLine())
      }
    }
  })

  return (
    <group ref={root}>
      <CharacterModel refs={refs} look={spec.look} />
      <group ref={tag} position-y={1.62}>
        <Html portal={labelLayer} center zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
          <div className="tag-stack">
            {line && <div className="speech other">{line}</div>}
            <div className="nametag other">{spec.name}</div>
          </div>
        </Html>
      </group>
    </group>
  )
}

/** 운동장을 산책하는 선생님들 (코드 이름은 ShadowTeachers 로 유지) */
export function ShadowTeachers({ myName, labelLayer, lowSpec = false }: { myName: string; labelLayer: RefObject<HTMLDivElement>; lowSpec?: boolean }) {
  // 이름을 다시 뽑아도 산책하는 선생님들은 그대로 (저사양 모드가 바뀔 때만 다시 만듦)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const specs = useMemo(() => makeSpecs(myName, lowSpec), [lowSpec])
  return (
    <>
      {specs.map((s, i) => (
        <ShadowTeacher key={i} spec={s} labelLayer={labelLayer} />
      ))}
    </>
  )
}
