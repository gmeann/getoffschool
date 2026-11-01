import * as THREE from 'three'
import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { TRACK } from '../data/world'

type Props = { onGroundClick: (point: THREE.Vector3) => void }

/** 짙은 보라빛 흙바닥 + 타원형 벽돌색 트랙 */
export function Ground({ onGroundClick }: Props) {
  const trackGeometry = useMemo(() => {
    const { rx, rz, width } = TRACK
    const shape = new THREE.Shape()
    shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0)
    const hole = new THREE.Path()
    hole.absellipse(0, 0, rx - width, rz - width, 0, Math.PI * 2, true, 0)
    shape.holes.push(hole)
    return new THREE.ShapeGeometry(shape, 48)
  }, [])

  const lineGeometry = useMemo(() => {
    // 트랙 가운데 흰 레인 선 (얇은 타원 링)
    const { rx, rz, width } = TRACK
    const mid = width / 2
    const w = 0.06
    const shape = new THREE.Shape()
    shape.absellipse(0, 0, rx - mid + w, rz - mid + w, 0, Math.PI * 2, false, 0)
    const hole = new THREE.Path()
    hole.absellipse(0, 0, rx - mid - w, rz - mid - w, 0, Math.PI * 2, true, 0)
    shape.holes.push(hole)
    return new THREE.ShapeGeometry(shape, 48)
  }, [])

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onGroundClick(e.point)
  }

  return (
    <group>
      {/* 넓은 바닥 (클릭 대상) */}
      <mesh rotation-x={-Math.PI / 2} onClick={handleClick}>
        <circleGeometry args={[220, 48]} />
        <meshStandardMaterial color="#5b4763" roughness={1} />
      </mesh>
      {/* 트랙 안쪽 운동장: 살짝 밝은 흙 */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} scale={[TRACK.rx - TRACK.width, TRACK.rz - TRACK.width, 1]} raycast={() => null}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#665170" roughness={1} />
      </mesh>
      <mesh geometry={trackGeometry} rotation-x={-Math.PI / 2} position-y={0.01} raycast={() => null}>
        <meshStandardMaterial color="#b4644c" roughness={0.95} />
      </mesh>
      <mesh geometry={lineGeometry} rotation-x={-Math.PI / 2} position-y={0.015} raycast={() => null}>
        <meshStandardMaterial color="#f3dccb" roughness={1} />
      </mesh>
    </group>
  )
}
