import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type TargetRingHandle = { show: (p: THREE.Vector3) => void }

const DURATION = 0.9

/** 클릭한 목표 지점에 잠깐 나타났다 사라지는 링 */
export const TargetRing = forwardRef<TargetRingHandle>(function TargetRing(_, ref) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const age = useRef(DURATION)

  useImperativeHandle(ref, () => ({
    show(p) {
      if (!mesh.current) return
      mesh.current.position.set(p.x, 0.03, p.z)
      age.current = 0
    },
  }))

  useFrame((_, dt) => {
    if (!mesh.current || !mat.current) return
    age.current = Math.min(age.current + dt, DURATION)
    const t = age.current / DURATION
    mesh.current.visible = t < 1
    const s = 0.6 + 0.5 * (1 - Math.pow(1 - t, 3))
    mesh.current.scale.setScalar(s)
    mat.current.opacity = 0.9 * (1 - t)
  })

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} visible={false} raycast={() => null}>
      <ringGeometry args={[0.32, 0.42, 32]} />
      <meshBasicMaterial ref={mat} color="#fff1c9" transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
})
