import { useLayoutEffect, useRef, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { OfficeRoom } from '../components/OfficeRoom'
import { Character } from '../components/Character'
import { CameraRig } from '../components/CameraRig'
import { Npc } from '../components/Npc'
import { TargetRing, type TargetRingHandle } from '../components/TargetRing'
import { CEILING_LAMPS, officeWorld } from '../data/office'
import { NPCS, type NpcDef, type NpcId } from '../data/npcs'
import { SCENES, type Door } from '../data/scenes'
import { setWorld, updatePlayer, walkTo } from '../hooks/playerStore'
import { useTimeOfDay } from '../hooks/useTimeOfDay'

type Props = {
  name: string
  bubble: string | null
  labelLayer: RefObject<HTMLDivElement>
  onDoor: (door: Door) => void
  onNpc: (npc: NpcDef) => void
  npcBubbles: Partial<Record<NpcId, string>>
  npcBows: Partial<Record<NpcId, number>>
}

/** 교무실 장면: 따뜻한 실내 + NPC 3명 */
export function Office({ name, bubble, labelLayer, onDoor, onNpc, npcBubbles, npcBows }: Props) {
  const ring = useRef<TargetRingHandle>(null)
  const sky = useTimeOfDay()

  useLayoutEffect(() => {
    // 서 있는 NPC 자리는 통과하지 못하게
    setWorld(officeWorld(NPCS.filter((n) => n.pose === 'stand').map((n) => ({ x: n.x, z: n.z, r: 0.35 }))))
  }, [])

  useFrame((_, dt) => updatePlayer(dt), -1)

  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.object.name !== 'floor') return
    e.stopPropagation()
    const t = walkTo(e.point)
    ring.current?.show(t)
  }

  return (
    <>
      <color attach="background" args={['#2e2420']} />
      {/* 실내는 따뜻하고 밝게: 환경광 + 반구광 + 점광원 2개 */}
      <hemisphereLight args={['#fff3de', '#8a6a50', 1.4]} />
      <ambientLight color="#ffe8cc" intensity={0.7} />
      <directionalLight color={sky.sun} intensity={0.5 + sky.sunIntensity * 0.15} position={[0, 6, -12]} />
      {CEILING_LAMPS.slice(0, 2).map((l, i) => (
        <pointLight key={i} position={[l.x, 2.4, l.z]} color="#ffd9a0" intensity={14} distance={13} decay={1.4} />
      ))}

      <group onClick={handleFloorClick}>
        <OfficeRoom sky={sky} onDoor={onDoor} labelLayer={labelLayer} />
      </group>
      {NPCS.map((n) => (
        <Npc key={n.id} npc={n} bubble={npcBubbles[n.id] ?? null} bowKey={npcBows[n.id] ?? 0} onSelect={onNpc} labelLayer={labelLayer} />
      ))}
      <TargetRing ref={ring} />
      <Character name={name} bubble={bubble} labelLayer={labelLayer} />
      <CameraRig scale={SCENES.office.cameraScale} />
    </>
  )
}
