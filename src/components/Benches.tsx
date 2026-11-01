import { BENCHES } from '../data/world'

const WOOD = '#9a6a4f'
const METAL = '#2e2838'

/** 나무 벤치 (박스 조합). 좌석 높이 약 0.49m */
function Bench({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[2.2, 0.08, 0.55]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.82, -0.26]} rotation-x={-0.12}>
        <boxGeometry args={[2.2, 0.32, 0.06]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      {[-0.95, 0.95].map((lx) => (
        <group key={lx} position={[lx, 0, 0]}>
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

export function Benches() {
  return (
    <>
      {BENCHES.map((b, i) => (
        <Bench key={i} {...b} />
      ))}
    </>
  )
}
