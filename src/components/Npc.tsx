import { useRef, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { NpcDef } from '../data/npcs'
import { player } from '../hooks/playerStore'
import { hoverCursor } from '../hooks/useDispose'
import { CharacterModel, SIT_LIFT, animateBody, newAnim, useBodyRefs } from './CharacterModel'

type Props = {
  npc: NpcDef
  bubble: string | null
  /** 값이 바뀌면 고개 숙여 인사 */
  bowKey: number
  onSelect: (npc: NpcDef) => void
  labelLayer: RefObject<HTMLDivElement>
}

function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

/** 교무실 NPC: 자리에서 가만히 서 있거나 앉아 있고, 가끔 천천히 고개를 돌림 */
export function Npc({ npc, bubble, bowKey, onSelect, labelLayer }: Props) {
  const root = useRef<THREE.Group>(null)
  const refs = useBodyRefs()
  const anim = useRef(newAnim())
  const seed = useRef(Math.random() * 100)
  const bowUntil = useRef(0)
  const lastBowKey = useRef(bowKey)
  const yaw = useRef(npc.yaw)

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    if (bowKey !== lastBowKey.current) {
      lastBowKey.current = bowKey
      bowUntil.current = t + 1.3
    }
    const g = root.current
    if (!g) return

    const dx = player.position.x - npc.x
    const dz = player.position.z - npc.z
    const near = Math.hypot(dx, dz) < 3.2
    const toPlayer = Math.atan2(dx, dz)

    // 서 있는 NPC는 가까이 오면 몸을 내 쪽으로, 앉은 NPC는 고개만
    if (npc.pose === 'stand') {
      yaw.current = lerpAngle(yaw.current, near ? toPlayer : npc.yaw, 1 - Math.exp(-3 * dt))
    }
    g.rotation.y = yaw.current

    if (refs.head.current) {
      let headTarget = Math.sin(t * 0.35 + seed.current) * 0.45 * Math.max(0, Math.sin(t * 0.13 + seed.current))
      if (near && npc.pose === 'sit') {
        headTarget = THREE.MathUtils.clamp(((toPlayer - yaw.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -0.8, 0.8)
      }
      refs.head.current.rotation.y = THREE.MathUtils.damp(refs.head.current.rotation.y, near && npc.pose === 'stand' ? 0 : headTarget, 2, dt)
    }

    const pose = t < bowUntil.current ? 'bow' : npc.pose
    animateBody(refs, anim.current, pose, dt)
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(npc)
  }

  const tagY = 1.66 + (npc.pose === 'sit' ? SIT_LIFT : 0)
  return (
    <group ref={root} position={[npc.x, 0, npc.z]} rotation-y={npc.yaw}>
      <group onClick={click} {...hoverCursor}>
        <CharacterModel refs={refs} look={npc.look} />
        {/* 누르기 쉽게 보이지 않는 넓은 영역 */}
        <mesh position={[0, 0.8, 0]} visible={false}>
          <cylinderGeometry args={[0.45, 0.45, 1.7, 8]} />
        </mesh>
      </group>
      <Html portal={labelLayer} position={[0, tagY, 0]} center zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
        <div className="tag-stack">
          {bubble && <div className="speech">{bubble}</div>}
          <div className="nametag npc">{npc.title}</div>
        </div>
      </Html>
    </group>
  )
}
