import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { player } from '../hooks/playerStore'
import { CharacterModel, PLAYER_LOOK, animateBody, newAnim, useBodyRefs } from './CharacterModel'

type Props = {
  name: string
  bubble: string | null
  labelLayer: RefObject<HTMLDivElement>
}

/** 내 캐릭터: 위치·방향은 playerStore 에서 읽고, 몸 동작은 자세(pose)에 맞춰 섞음 */
export function Character({ name, bubble, labelLayer }: Props) {
  const root = useRef<THREE.Group>(null)
  const refs = useBodyRefs()
  const anim = useRef(newAnim())
  const tag = useRef<THREE.Group>(null)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    if (!root.current) return
    root.current.position.copy(player.position)
    root.current.rotation.y = player.yaw
    animateBody(refs, anim.current, player.pose, dt, 1, player.sitLift)
    // 앉으면 머리가 올라가니 이름표도 같이 올림
    if (tag.current) tag.current.position.y = 1.72 + anim.current.sit * player.sitLift
  })

  return (
    <group ref={root}>
      <CharacterModel refs={refs} look={PLAYER_LOOK} />
      {/* 이름표 + 말풍선 (HTML 오버레이) */}
      <group ref={tag} position-y={1.72}>
      <Html portal={labelLayer} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="tag-stack">
          {bubble && <div className="speech">{bubble}</div>}
          <div className="nametag">
            <span className="nametag-me">나</span>
            <span className="nametag-bar">|</span>
            {name}
          </div>
        </div>
      </Html>
      </group>
    </group>
  )
}
