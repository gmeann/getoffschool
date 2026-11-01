import { Instances, Instance } from '@react-three/drei'
import { LAMPS } from '../data/world'

const POLE_H = 3.2

/** 가로등 (기둥/전등갓/전구 인스턴싱). pointLight 는 앞의 2개에만 둠 */
export function StreetLamps() {
  return (
    <group>
      <Instances limit={LAMPS.length}>
        <cylinderGeometry args={[0.06, 0.09, POLE_H, 6]} />
        <meshStandardMaterial color="#2e2838" roughness={0.8} />
        {LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, POLE_H / 2, l.z]} />
        ))}
      </Instances>
      <Instances limit={LAMPS.length}>
        <coneGeometry args={[0.32, 0.28, 6, 1, true]} />
        <meshStandardMaterial color="#2e2838" roughness={0.8} side={2} />
        {LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, POLE_H + 0.12, l.z]} />
        ))}
      </Instances>
      <Instances limit={LAMPS.length}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#ffe3a3" emissive="#ffd27a" emissiveIntensity={2.2} toneMapped={false} />
        {LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, POLE_H - 0.02, l.z]} />
        ))}
      </Instances>
      {LAMPS.slice(0, 2).map((l, i) => (
        <pointLight key={i} position={[l.x, POLE_H - 0.3, l.z]} color="#ffd38a" intensity={9} distance={9} decay={1.6} />
      ))}
    </group>
  )
}
