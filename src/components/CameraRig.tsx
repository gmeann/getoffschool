import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { player } from '../hooks/playerStore'

/** 캐릭터 기준 카메라 오프셋 (뒤쪽 위). 각도는 고정 */
const OFFSET = new THREE.Vector3(0, 4.6, 9.5)
const LOOK_HEIGHT = 1.6
/** 앉았을 때: 살짝 가까이 */
const SIT_SCALE = 0.62
const SIT_LOOK_HEIGHT = 1.2
/** 하늘 보기: 캐릭터 뒤 낮은 곳에서 위쪽 하늘을 올려다봄 */
const SKY_OFFSET = new THREE.Vector3(0, 1.3, 4.2)
const SKY_LOOK = new THREE.Vector3(0, 9.5, -16)

const FOLLOW = 4 // 클수록 빨리 따라옴
const ZOOM_MIN = 0.55
const ZOOM_MAX = 1.6

/** 3인칭 고정 각도 추적 카메라. 자유 회전 없음, PC 마우스 휠로 확대/축소만 */
export function CameraRig({ scale: sceneScale = 1 }: { scale?: number }) {
  const { camera, gl, size } = useThree()
  // 세로 화면(폰)에서는 가로 시야가 좁으니 조금 더 뒤로 물러남
  const aspectScale = (size.width / size.height < 1 ? 1.4 : 1) * sceneScale
  const zoom = useRef(1)
  const zoomTarget = useRef(1)
  const sit = useRef(0)
  const sky = useRef(0)
  const focus = useRef(new THREE.Vector3())
  const camPos = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  const tmp = useRef(new THREE.Vector3())
  const init = useRef(false)

  useEffect(() => {
    const el = gl.domElement
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomTarget.current = THREE.MathUtils.clamp(zoomTarget.current * Math.exp(e.deltaY * 0.001), ZOOM_MIN, ZOOM_MAX)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [gl])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const k = 1 - Math.exp(-FOLLOW * dt)
    if (!init.current) {
      focus.current.copy(player.position)
      init.current = true
    } else {
      focus.current.lerp(player.position, k)
    }
    zoom.current = THREE.MathUtils.damp(zoom.current, zoomTarget.current, 8, dt)
    sit.current = THREE.MathUtils.damp(sit.current, player.pose === 'sit' ? 1 : 0, 2.5, dt)
    // 하늘 보기는 천천히
    sky.current = THREE.MathUtils.damp(sky.current, player.skyLook ? 1 : 0, 1.2, dt)

    const s = THREE.MathUtils.smoothstep(sky.current, 0, 1)
    const scale = zoom.current * aspectScale * THREE.MathUtils.lerp(1, SIT_SCALE, sit.current)
    const lookH = THREE.MathUtils.lerp(LOOK_HEIGHT, SIT_LOOK_HEIGHT, sit.current)

    // 기본 위치/시선
    camPos.current.copy(OFFSET).multiplyScalar(scale)
    look.current.set(0, lookH, 0)
    // 하늘 보기 위치/시선과 섞기
    tmp.current.copy(SKY_OFFSET).multiplyScalar(aspectScale)
    camPos.current.lerp(tmp.current, s)
    look.current.lerp(SKY_LOOK, s)

    camera.position.copy(camPos.current).add(focus.current)
    camera.lookAt(look.current.add(focus.current))
  })

  return null
}
