import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { MoveState } from '../hooks/useClickToMove'

/** 캐릭터 기준 카메라 오프셋 (뒤쪽 위). 각도는 고정 */
const OFFSET = new THREE.Vector3(0, 4.6, 9.5)
const LOOK_HEIGHT = 1.6
const FOLLOW = 4 // 클수록 빨리 따라옴
const ZOOM_MIN = 0.55
const ZOOM_MAX = 1.6

/** 3인칭 고정 각도 추적 카메라. 회전 없음, PC 마우스 휠로 확대/축소만 */
export function CameraRig({ move }: { move: RefObject<MoveState> }) {
  const { camera, gl, size } = useThree()
  // 세로 화면(폰)에서는 가로 시야가 좁으니 조금 더 뒤로 물러남
  const aspectScale = size.width / size.height < 1 ? 1.4 : 1
  const zoom = useRef(1)
  const zoomTarget = useRef(1)
  const focus = useRef(new THREE.Vector3())
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
    const s = move.current
    if (!s) return
    const k = 1 - Math.exp(-FOLLOW * dt)
    if (!init.current) {
      focus.current.copy(s.position)
      init.current = true
    } else {
      focus.current.lerp(s.position, k)
    }
    zoom.current = THREE.MathUtils.damp(zoom.current, zoomTarget.current, 8, dt)
    tmp.current.copy(OFFSET).multiplyScalar(zoom.current * aspectScale).add(focus.current)
    camera.position.copy(tmp.current)
    camera.lookAt(focus.current.x, focus.current.y + LOOK_HEIGHT, focus.current.z)
  })

  return null
}
