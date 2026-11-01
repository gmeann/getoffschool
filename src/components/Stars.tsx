import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { player } from '../hooks/playerStore'
import { useDispose } from '../hooks/useDispose'

const COUNT = 140

/**
 * 하늘 위쪽의 별. 밤에는 또렷하고, 저녁엔 희미하게.
 * "하늘 보기" 중에는 낮에도 몇 개가 살짝 보이도록 밝기를 더함.
 */
export function Stars({ level }: { level: number }) {
  const mat = useRef<THREE.PointsMaterial>(null)
  const geometry = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      // 위쪽 반구에 고르게 (지평선 근처는 피함)
      const y = 0.18 + Math.random() * 0.82
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(1 - y * y)
      pos.set([Math.cos(a) * r * 350, y * 350, Math.sin(a) * r * 350], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  useDispose(geometry)
  const look = useRef(0)

  useFrame((_, dt) => {
    look.current = THREE.MathUtils.damp(look.current, player.skyLook ? 1 : 0, 1.5, Math.min(dt, 0.05))
    if (mat.current) {
      const o = Math.min(1, level + look.current * 0.45)
      mat.current.opacity = o
      mat.current.visible = o > 0.01
    }
  })

  return (
    <points geometry={geometry} renderOrder={-0.5} frustumCulled={false}>
      <pointsMaterial ref={mat} color="#fff8e6" size={2.4} sizeAttenuation={false} transparent depthWrite={false} fog={false} />
    </points>
  )
}
