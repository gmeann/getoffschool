import * as THREE from 'three'
import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useDispose } from '../hooks/useDispose'
import { LAWN, TRACK } from '../data/world'
import { Instances, Instance } from '@react-three/drei'

type Props = { onGroundClick: (point: THREE.Vector3) => void; ground: THREE.Color; field: THREE.Color }

/** 짙은 보라빛 흙바닥 + 타원형 벽돌색 트랙 */
export function Ground({ onGroundClick, ground, field }: Props) {
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

  useDispose(trackGeometry, lineGeometry)

  // 잔디밭 위 풀 포기 (매번 같은 자리)
  const tufts = useMemo(() => {
    const list: [number, number, number][] = []
    for (let i = 0; i < 36; i++) {
      const a = i * 2.399
      const r = Math.sqrt((i + 0.5) / 36) * 0.92
      list.push([Math.cos(a) * r * LAWN.rx, Math.sin(a) * r * LAWN.rz, 0.7 + ((i * 37) % 10) / 20])
    }
    return list
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
        <meshStandardMaterial color={ground} roughness={1} />
      </mesh>
      {/* 트랙 안쪽 운동장: 살짝 밝은 흙 */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} scale={[TRACK.rx - TRACK.width, TRACK.rz - TRACK.width, 1]} raycast={() => null}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color={field} roughness={1} />
      </mesh>
      {/* 가운데 잔디밭: 어디서든 바닥에 앉을 수 있음 */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.008} scale={[LAWN.rx, LAWN.rz, 1]} raycast={() => null}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#6f9a5a" roughness={1} />
      </mesh>
      <Instances limit={tufts.length}>
        <coneGeometry args={[0.12, 0.28, 4]} />
        <meshStandardMaterial color="#5d8a4a" roughness={1} flatShading />
        {tufts.map(([x, z, s], i) => (
          <Instance key={i} position={[x, 0.12 * s, z]} scale={s} rotation-y={i} />
        ))}
      </Instances>
      <mesh geometry={trackGeometry} rotation-x={-Math.PI / 2} position-y={0.01} raycast={() => null}>
        <meshStandardMaterial color="#b4644c" roughness={0.95} />
      </mesh>
      <mesh geometry={lineGeometry} rotation-x={-Math.PI / 2} position-y={0.015} raycast={() => null}>
        <meshStandardMaterial color="#f3dccb" roughness={1} />
      </mesh>
    </group>
  )
}
