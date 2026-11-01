import { Instances, Instance } from '@react-three/drei'
import { TREES } from '../data/world'

/** 낮은 로우폴리 나무 (줄기 + 잎 두 덩이, 모두 인스턴싱) */
export function Trees() {
  return (
    <group>
      <Instances limit={TREES.length}>
        <cylinderGeometry args={[0.16, 0.22, 1.2, 6]} />
        <meshStandardMaterial color="#5a3b3a" roughness={1} flatShading />
        {TREES.map((t, i) => (
          <Instance key={i} position={[t.x, 0.6 * t.s, t.z]} scale={t.s} />
        ))}
      </Instances>
      <Instances limit={TREES.length * 2}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#5e6b4f" roughness={1} flatShading />
        {TREES.map((t, i) => (
          <Instance key={`a${i}`} position={[t.x, 1.65 * t.s, t.z]} scale={[1.05 * t.s, 0.95 * t.s, 1.05 * t.s]} rotation={[0, i, 0]} />
        ))}
        {TREES.map((t, i) => (
          <Instance key={`b${i}`} position={[t.x + 0.15 * t.s, 2.35 * t.s, t.z - 0.1 * t.s]} scale={0.65 * t.s} rotation={[0.3, i * 2, 0]} color="#6d7a58" />
        ))}
      </Instances>
    </group>
  )
}
