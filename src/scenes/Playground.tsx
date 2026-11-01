import { useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { SunsetSky } from '../components/SunsetSky'
import { Ground } from '../components/Ground'
import { Mountains } from '../components/Mountains'
import { Trees } from '../components/Trees'
import { StreetLamps } from '../components/StreetLamps'
import { Bench } from '../components/Bench'
import { Character } from '../components/Character'
import { CameraRig } from '../components/CameraRig'
import { TargetRing, type TargetRingHandle } from '../components/TargetRing'
import { useClickToMove } from '../hooks/useClickToMove'
import { PLAYER_START } from '../data/world'

type Props = { name: string; bubble: string | null; labelLayer: RefObject<HTMLDivElement> }

/** 1단계 장면: 노을 진 운동장 */
export function Playground({ name, bubble, labelLayer }: Props) {
  const { state, setTarget } = useClickToMove(PLAYER_START)
  const ring = useRef<TargetRingHandle>(null)

  const handleGroundClick = (point: THREE.Vector3) => {
    const t = setTarget(point)
    ring.current?.show(t)
  }

  return (
    <>
      <color attach="background" args={['#d9777f']} />
      <fog attach="fog" args={['#d98a85', 40, 175]} />

      {/* 조명: 따뜻한 주황 방향광 + 은은한 보라 환경광 */}
      <hemisphereLight args={['#c9b3f0', '#6a4a6a', 1.6]} />
      <ambientLight color="#9a86cf" intensity={0.6} />
      <directionalLight color="#ffb070" intensity={2.6} position={[-18, 10, 14]} />

      <SunsetSky />
      <Mountains />
      <Ground onGroundClick={handleGroundClick} />
      <Trees />
      <StreetLamps />
      <Bench />
      <TargetRing ref={ring} />
      <Character move={state} name={name} bubble={bubble} labelLayer={labelLayer} />
      <CameraRig move={state} />
    </>
  )
}
