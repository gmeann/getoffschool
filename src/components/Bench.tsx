import { BENCH } from '../data/world'

const WOOD = '#9a6a4f'
const METAL = '#2e2838'

/** 나무 벤치 1개 (박스 조합) */
export function Bench() {
  return (
    <group position={[BENCH.x, 0, BENCH.z]} rotation-y={BENCH.rotY}>
      {/* 앉는 판 */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[2.2, 0.08, 0.55]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      {/* 등받이 */}
      <mesh position={[0, 0.82, -0.26]} rotation-x={-0.12}>
        <boxGeometry args={[2.2, 0.32, 0.06]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      {/* 다리 */}
      {[-0.95, 0.95].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.22, 0.18]}>
            <boxGeometry args={[0.07, 0.45, 0.07]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
          <mesh position={[0, 0.45, -0.22]}>
            <boxGeometry args={[0.07, 0.9, 0.07]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
