import { useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { NICKNAMES } from '../data/nicknames'
import { pickShadowLine } from '../data/shadowLines'
import { BENCHES, LANE, TALK_DISTANCE, laneSpeedFactor, lanePoint, seatInfo } from '../data/world'
import { player } from '../hooks/playerStore'
import { CharacterModel, animateBody, newAnim, useBodyRefs } from './CharacterModel'

type Spec = {
  name: string
  kind: 'walk' | 'run' | 'sit'
  speed: number // m/s
  theta: number // 트랙 위 시작 각도
  offset: number // 레인 안쪽/바깥쪽 치우침
  bench: number
}

const BUBBLE_SECONDS = 3
const COOLDOWN_SECONDS = 10
/** 여러 그림자가 동시에 말하지 않게 하는 전체 간격 */
const GLOBAL_GAP = 1.2
let globalNextTalk = 0

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** 접속할 때마다 인원·속도·위치가 조금씩 달라짐 */
function makeSpecs(myName: string): Spec[] {
  const count = 6 + Math.floor(Math.random() * 3) // 6~8명
  const sitters = Math.min(BENCHES.length, 1 + Math.floor(Math.random() * 2)) // 1~2명
  const names = NICKNAMES.filter((n) => n !== myName).sort(() => Math.random() - 0.5)
  const benchOrder = BENCHES.map((_, i) => i).sort(() => Math.random() - 0.5)
  return Array.from({ length: count }, (_, i) => {
    const sit = i < sitters
    const run = !sit && Math.random() < 0.35
    return {
      name: names[i % names.length],
      kind: sit ? 'sit' : run ? 'run' : 'walk',
      speed: run ? rand(3.2, 4.6) : rand(0.9, 1.7),
      // 트랙 위에 고르게 흩어 놓고 조금씩 흔듦 (처음부터 뭉치지 않게)
      theta: (i / count) * Math.PI * 2 + rand(-0.3, 0.3),
      offset: rand(-0.7, 0.7),
      bench: sit ? benchOrder[i] : -1,
    }
  })
}

function ShadowTeacher({ spec, material, labelLayer }: { spec: Spec; material: THREE.Material; labelLayer: RefObject<HTMLDivElement> }) {
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
      animateBody(refs, anim.current, spec.kind, dt)
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
      <CharacterModel refs={refs} ghost={material} />
      <group ref={tag} position-y={1.62}>
        <Html portal={labelLayer} center zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
          <div className="tag-stack">
            {line && <div className="speech ghost">{line}</div>}
            <div className="nametag ghost">{spec.name}</div>
          </div>
        </Html>
      </group>
    </group>
  )
}

/** 그림자 선생님들: 반투명한 흰빛 재질 하나를 모두 함께 씀 */
export function ShadowTeachers({ myName, labelLayer }: { myName: string; labelLayer: RefObject<HTMLDivElement> }) {
  const specs = useMemo(() => makeSpecs(myName), [myName])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#dfe6ff',
        emissiveIntensity: 0.45,
        roughness: 1,
        transparent: true,
        opacity: 0.45,
      }),
    [],
  )
  return (
    <>
      {specs.map((s, i) => (
        <ShadowTeacher key={i} spec={s} material={material} labelLayer={labelLayer} />
      ))}
    </>
  )
}
