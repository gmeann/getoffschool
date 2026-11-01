import type { RefObject } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { CABINETS, CEILING_LAMPS, DESKS, PLANTS, ROOM, WATER, WINDOWS, chairOf } from '../data/office'
import { SCENES, type Door } from '../data/scenes'
import type { Sky } from '../hooks/useTimeOfDay'
import { BulletinBoard, CeilingLamps, OnWall, Plants, RoomDoor, RoomShell, WOOD_DARK, WallClock, WindowView } from './RoomParts'

const DESK_TOP = '#d9b98f'
const METAL = '#9aa0a8'

/** 책상·의자·소품 (모두 인스턴싱으로 재사용) */
function Desks() {
  const chairs = DESKS.map(chairOf)
  // 책상 기준 로컬 좌표를 월드로
  const local = (d: (typeof DESKS)[number], lx: number, lz: number): [number, number] => {
    const c = Math.cos(d.rotY)
    const s = Math.sin(d.rotY)
    return [d.x + lx * c + lz * s, d.z - lx * s + lz * c]
  }
  return (
    <group>
      {/* 상판 */}
      <Instances limit={DESKS.length}>
        <boxGeometry args={[1.5, 0.05, 0.75]} />
        <meshStandardMaterial color={DESK_TOP} roughness={0.8} />
        {DESKS.map((d, i) => (
          <Instance key={i} position={[d.x, 0.74, d.z]} rotation-y={d.rotY} scale={d.s ?? 1} />
        ))}
      </Instances>
      {/* 옆판 2개씩 */}
      <Instances limit={DESKS.length * 2}>
        <boxGeometry args={[0.05, 0.72, 0.7]} />
        <meshStandardMaterial color={WOOD_DARK} />
        {DESKS.flatMap((d, i) =>
          [-0.7, 0.7].map((lx) => {
            const [x, z] = local(d, lx * (d.s ?? 1), 0)
            return <Instance key={`${i}${lx}`} position={[x, 0.36, z]} rotation-y={d.rotY} />
          }),
        )}
      </Instances>
      {/* 모니터 */}
      <Instances limit={DESKS.length}>
        <boxGeometry args={[0.55, 0.36, 0.04]} />
        <meshStandardMaterial color="#2c2a33" roughness={0.5} />
        {DESKS.map((d, i) => {
          const [x, z] = local(d, -0.25, 0.22 * (d.s ?? 1))
          return <Instance key={i} position={[x, 1.0, z]} rotation-y={d.rotY} />
        })}
      </Instances>
      {/* 서류 더미 */}
      <Instances limit={DESKS.length}>
        <boxGeometry args={[0.3, 0.12, 0.38]} />
        <meshStandardMaterial color="#fbf8f0" />
        {DESKS.map((d, i) => {
          const [x, z] = local(d, 0.45, 0.05)
          return <Instance key={i} position={[x, 0.82 + (i % 3) * 0.03, z]} rotation-y={d.rotY + (i % 2) * 0.15} scale={[1, 1 + (i % 3) * 0.5, 1]} />
        })}
      </Instances>
      {/* 컵 */}
      <Instances limit={DESKS.length}>
        <cylinderGeometry args={[0.045, 0.04, 0.11, 10]} />
        <meshStandardMaterial color="#ffffff" />
        {DESKS.map((d, i) => {
          const [x, z] = local(d, 0.15, -0.2)
          return <Instance key={i} position={[x, 0.82, z]} color={['#ffffff', '#ffd6a5', '#a0c4ff', '#caffbf'][i % 4]} />
        })}
      </Instances>
      {/* 의자: 좌석 + 등받이 + 기둥 */}
      <Instances limit={chairs.length}>
        <boxGeometry args={[0.46, 0.07, 0.44]} />
        <meshStandardMaterial color="#5b6475" />
        {chairs.map((c, i) => (
          <Instance key={i} position={[c.x, 0.45, c.z]} rotation-y={c.rotY} />
        ))}
      </Instances>
      <Instances limit={chairs.length}>
        <boxGeometry args={[0.44, 0.5, 0.06]} />
        <meshStandardMaterial color="#5b6475" />
        {chairs.map((c, i) => (
          <Instance
            key={i}
            position={[c.x - Math.sin(c.rotY) * 0.22, 0.75, c.z - Math.cos(c.rotY) * 0.22]}
            rotation-y={c.rotY}
          />
        ))}
      </Instances>
      <Instances limit={chairs.length}>
        <cylinderGeometry args={[0.03, 0.03, 0.42, 6]} />
        <meshStandardMaterial color={METAL} />
        {chairs.map((c, i) => (
          <Instance key={i} position={[c.x, 0.21, c.z]} />
        ))}
      </Instances>
    </group>
  )
}

type Props = { sky: Sky; onDoor: (door: Door) => void; labelLayer: RefObject<HTMLDivElement> }

/** 교무실 방 전체: 바닥, 벽(안쪽만 보이게), 천장, 창문, 가구, 출입문 */
export function OfficeRoom({ sky, onDoor, labelLayer }: Props) {
  const door = SCENES.office.doors[0]
  return (
    <group>
      <RoomShell room={ROOM} />
      <CeilingLamps list={CEILING_LAMPS} height={ROOM.height} />
      {WINDOWS.map((x) => (
        <OnWall key={x} position={[x, 1.75, ROOM.minZ]} rotY={0}>
          <WindowView sky={sky} />
        </OnWall>
      ))}
      <OnWall position={[0, 2.55, ROOM.minZ]} rotY={0}>
        <WallClock />
      </OnWall>
      <OnWall position={[ROOM.maxX - 0.04, 1.65, 0.8]} rotY={-Math.PI / 2}>
        <BulletinBoard />
      </OnWall>
      <Desks />

      {/* 서류함 */}
      <Instances limit={CABINETS.length}>
        <boxGeometry args={[0.9, 1.3, 0.55]} />
        <meshStandardMaterial color="#c4c8ce" roughness={0.6} />
        {CABINETS.map((c, i) => (
          <Instance key={i} position={[c.x, 0.65, c.z]} />
        ))}
      </Instances>
      <Instances limit={CABINETS.length * 4}>
        <boxGeometry args={[0.24, 0.035, 0.03]} />
        <meshStandardMaterial color="#6d737b" />
        {CABINETS.flatMap((c, i) => [0.3, 0.62, 0.94, 1.18].map((y) => <Instance key={`${i}${y}`} position={[c.x, y, c.z + 0.29]} />))}
      </Instances>

      {/* 정수기 */}
      <group position={[WATER.x, 0, WATER.z]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.42, 1.0, 0.42]} />
          <meshStandardMaterial color="#f4f6f8" />
        </mesh>
        <mesh position={[0, 1.22, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.44, 12]} />
          <meshStandardMaterial color="#8fc8f0" transparent opacity={0.75} />
        </mesh>
        <mesh position={[0.08, 0.72, 0.22]}>
          <boxGeometry args={[0.06, 0.06, 0.04]} />
          <meshStandardMaterial color="#e05a5a" />
        </mesh>
        <mesh position={[-0.08, 0.72, 0.22]}>
          <boxGeometry args={[0.06, 0.06, 0.04]} />
          <meshStandardMaterial color="#4a86e0" />
        </mesh>
      </group>

      <Plants list={PLANTS} />
      <RoomDoor door={door} onDoor={onDoor} labelLayer={labelLayer} />
    </group>
  )
}
