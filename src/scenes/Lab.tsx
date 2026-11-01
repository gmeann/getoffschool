import { useLayoutEffect, useRef, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { LabRoom } from '../components/LabRoom'
import { Character } from '../components/Character'
import { CameraRig } from '../components/CameraRig'
import { TargetRing, type TargetRingHandle } from '../components/TargetRing'
import { LAB_LAMPS, LAB_WORLD } from '../data/lab'
import { SCENES, type Door } from '../data/scenes'
import type { BoardId } from '../data/boards'
import { setWorld, updatePlayer, walkTo } from '../hooks/playerStore'
import { useTimeOfDay } from '../hooks/useTimeOfDay'

type Props = {
  name: string
  bubble: string | null
  labelLayer: RefObject<HTMLDivElement>
  onDoor: (door: Door) => void
  onBoard: (b: BoardId) => void
}

/** 연구실 장면: 책장·작업 테이블 + 메모보드·냉장고·칠판 */
export function Lab({ name, bubble, labelLayer, onDoor, onBoard }: Props) {
  const ring = useRef<TargetRingHandle>(null)
  const sky = useTimeOfDay()

  useLayoutEffect(() => setWorld(LAB_WORLD), [])
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
      <hemisphereLight args={['#fff1dc', '#7a5a48', 1.35]} />
      <ambientLight color="#ffe6c4" intensity={0.7} />
      <directionalLight color={sky.sun} intensity={0.45 + sky.sunIntensity * 0.18} position={[-14, 6, 2]} />
      {LAB_LAMPS.slice(0, 2).map((l, i) => (
        <pointLight key={i} position={[l.x, 2.4, l.z]} color="#ffd9a0" intensity={13} distance={13} decay={1.4} />
      ))}
      <group onClick={handleFloorClick}>
        <LabRoom sky={sky} onDoor={onDoor} onOpen={onBoard} labelLayer={labelLayer} />
      </group>
      <TargetRing ref={ring} />
      <Character name={name} bubble={bubble} labelLayer={labelLayer} />
      <CameraRig scale={SCENES.lab.cameraScale} />
    </>
  )
}
