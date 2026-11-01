import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'

/** 멀리 둘러싼 낮은 산 실루엣 (로우폴리 원뿔, 인스턴싱) */
export function Mountains() {
  const peaks = useMemo(() => {
    const list: { pos: [number, number, number]; scale: [number, number, number]; rot: number }[] = []
    const count = 22
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.sin(i * 12.9) * 0.08
      const r = 105 + ((i * 37) % 5) * 6
      const h = 7 + ((i * 53) % 7) * 1.6
      const w = 22 + ((i * 29) % 4) * 6
      list.push({ pos: [Math.cos(a) * r, 0, Math.sin(a) * r], scale: [w, h, w * 0.7], rot: a })
    }
    return list
  }, [])

  return (
    <Instances limit={peaks.length} raycast={() => null}>
      <coneGeometry args={[1, 1, 5, 1]} />
      <meshStandardMaterial color="#3d2f55" roughness={1} flatShading />
      {peaks.map((p, i) => (
        <Instance key={i} position={[p.pos[0], p.scale[1] / 2 - 0.5, p.pos[2]]} scale={p.scale} rotation={[0, p.rot, 0]} />
      ))}
    </Instances>
  )
}
