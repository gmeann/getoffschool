import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Sky } from '../components/Sky'
import { Stars } from '../components/Stars'
import { Ground } from '../components/Ground'
import { Mountains } from '../components/Mountains'
import { Trees } from '../components/Trees'
import { StreetLamps } from '../components/StreetLamps'
import { Benches } from '../components/Benches'
import { Character } from '../components/Character'
import { ShadowTeachers } from '../components/ShadowTeachers'
import { CameraRig } from '../components/CameraRig'
import { TargetRing, type TargetRingHandle } from '../components/TargetRing'
import { updatePlayer, walkTo } from '../hooks/playerStore'
import { useTimeOfDay } from '../hooks/useTimeOfDay'

type Props = { name: string; bubble: string | null; labelLayer: RefObject<HTMLDivElement> }

/** 운동장 장면 */
export function Playground({ name, bubble, labelLayer }: Props) {
  const ring = useRef<TargetRingHandle>(null)
  const sky = useTimeOfDay()

  // 내 캐릭터 이동은 다른 것보다 먼저 계산 (카메라·그림자가 같은 프레임 위치를 쓰도록)
  useFrame((_, dt) => updatePlayer(dt), -1)

  const handleGroundClick = (point: THREE.Vector3) => {
    const t = walkTo(point)
    ring.current?.show(t)
  }

  return (
    <>
      <color attach="background" args={[sky.skyMid]} />
      <fog attach="fog" args={[sky.fog, 40, 175]} />

      {/* 조명: 시간대에 따라 색과 세기가 바뀜 */}
      <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.hemiIntensity]} />
      <ambientLight color={sky.ambient} intensity={sky.ambientIntensity} />
      <directionalLight color={sky.sun} intensity={sky.sunIntensity} position={sky.sunPos} />

      <Sky sky={sky} />
      <Stars level={sky.stars} />
      <Mountains />
      <Ground onGroundClick={handleGroundClick} ground={sky.ground} field={sky.field} />
      <Trees />
      <StreetLamps level={sky.lamp} />
      <Benches />
      <TargetRing ref={ring} />
      <ShadowTeachers myName={name} labelLayer={labelLayer} />
      <Character name={name} bubble={bubble} labelLayer={labelLayer} />
      <CameraRig />
    </>
  )
}
