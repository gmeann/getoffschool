import { useLayoutEffect, useRef, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { ClassroomRoom } from '../components/ClassroomRoom'
import { Character } from '../components/Character'
import { CameraRig } from '../components/CameraRig'
import { TargetRing, type TargetRingHandle } from '../components/TargetRing'
import { TaskEffects, type TaskEffectsHandle } from '../components/TaskEffects'
import { PaperPile } from '../components/PaperPile'
import { CLASS_LAMPS, CLASSROOM_WORLD } from '../data/classroom'
import { SCENES, type Door } from '../data/scenes'
import type { TaskLabel } from '../data/tasks'
import { setWorld, updatePlayer, walkTo } from '../hooks/playerStore'
import { useTimeOfDay } from '../hooks/useTimeOfDay'

type Props = {
  name: string
  bubble: string | null
  labelLayer: RefObject<HTMLDivElement>
  onDoor: (door: Door) => void
  effectsRef: RefObject<TaskEffectsHandle | null>
  remaining: number
  topLabel: TaskLabel | null
  onFling: () => void
}

/** 교실 장면: 칠판·학생 책상·내 업무 책상 + 업무 날리기 */
export function Classroom({ name, bubble, labelLayer, onDoor, effectsRef, remaining, topLabel, onFling }: Props) {
  const ring = useRef<TargetRingHandle>(null)
  const sky = useTimeOfDay()

  useLayoutEffect(() => setWorld(CLASSROOM_WORLD), [])
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
      <hemisphereLight args={['#fff3de', '#8a6a50', 1.4]} />
      <ambientLight color="#ffe8cc" intensity={0.7} />
      {/* 창문 쪽(왼쪽)에서 들어오는 바깥빛 */}
      <directionalLight color={sky.sun} intensity={0.5 + sky.sunIntensity * 0.2} position={[-14, 6, 0]} />
      {[CLASS_LAMPS[0], CLASS_LAMPS[5]].map((l, i) => (
        <pointLight key={i} position={[l.x * 0.7, 2.5, l.z * 0.5]} color="#ffe2b8" intensity={14} distance={14} decay={1.4} />
      ))}

      <group onClick={handleFloorClick}>
        <ClassroomRoom sky={sky} onDoor={onDoor} labelLayer={labelLayer} />
      </group>
      <PaperPile remaining={remaining} topLabel={topLabel} onFling={onFling} labelLayer={labelLayer} />
      <TaskEffects ref={effectsRef} />
      <TargetRing ref={ring} />
      <Character name={name} bubble={bubble} labelLayer={labelLayer} />
      <CameraRig scale={SCENES.classroom.cameraScale} />
    </>
  )
}
