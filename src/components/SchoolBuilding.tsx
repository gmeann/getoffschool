import { useMemo, type RefObject } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Html, Instances, Instance } from '@react-three/drei'
import { BUILDING } from '../data/world'
import { SCENES, type Door } from '../data/scenes'
import { hoverCursor } from '../hooks/useDispose'

type Props = {
  onDoor: (door: Door) => void
  /** 창문 불빛 세기 (밤일수록 밝게) */
  glow: number
  labelLayer: RefObject<HTMLDivElement>
}

const DOOR_W = 1.3
const DOOR_H = 2.3

/** 운동장 북쪽의 학교 건물: 박스 + 삼각 지붕 + 따뜻한 창문 불빛 + 정면 문 3개 */
export function SchoolBuilding({ onDoor, glow, labelLayer }: Props) {
  const { x, z, w, d, h } = BUILDING
  const front = z + d / 2
  const doors = SCENES.playground.doors

  // 창문 위치: 2층은 고르게, 1층은 문 사이사이
  const windows = useMemo(() => {
    const list: [number, number][] = []
    for (const wx of [-9, -6, -3, 0, 3, 6, 9]) list.push([wx, 4.3])
    for (const wx of [-9, -3, 3, 9]) list.push([wx, 1.7])
    return list
  }, [])

  const click = (door: Door) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onDoor(door)
  }

  return (
    <group>
      {/* 본관 */}
      <mesh position={[x, h / 2, z]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#e8d9c2" roughness={0.95} />
      </mesh>
      {/* 1층·2층 사이 띠 */}
      <mesh position={[x, 3.05, front + 0.03]}>
        <boxGeometry args={[w + 0.1, 0.18, 0.08]} />
        <meshStandardMaterial color="#b9a58c" />
      </mesh>
      {/* 삼각 지붕 (3각 기둥) */}
      <group position={[x, h + 0.95, z]} scale={[1, 0.5, 1]}>
        <group rotation-z={Math.PI / 2}>
          {/* 꼭짓점 하나가 위를 향하도록 기둥 축 기준으로 돌림 */}
          <mesh rotation-y={Math.PI / 2}>
            <cylinderGeometry args={[3.8, 3.8, w + 0.8, 3, 1]} />
            <meshStandardMaterial color="#8a3b35" roughness={0.9} flatShading />
          </mesh>
        </group>
      </group>

      {/* 창문: 따뜻한 불빛 (재사용) */}
      <Instances limit={windows.length}>
        <planeGeometry args={[1.5, 1.2]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffc777" emissiveIntensity={0.5 + glow * 0.9} toneMapped={false} />
        {windows.map(([wx, wy], i) => (
          <Instance key={i} position={[wx, wy, front + 0.02]} />
        ))}
      </Instances>
      <Instances limit={windows.length * 2}>
        <boxGeometry args={[1.66, 0.1, 0.08]} />
        <meshStandardMaterial color="#7a6250" />
        {windows.flatMap(([wx, wy], i) => [
          <Instance key={`t${i}`} position={[wx, wy + 0.64, front + 0.04]} />,
          <Instance key={`b${i}`} position={[wx, wy - 0.64, front + 0.04]} />,
        ])}
      </Instances>

      {/* 문 3개 */}
      {doors.map((door) => {
        const ready = SCENES[door.to].ready
        return (
          <group key={door.id} position={[door.x, 0, front]}>
            <group onClick={click(door)} {...hoverCursor}>
              {/* 문틀 */}
              <mesh position={[0, DOOR_H / 2 + 0.05, 0.03]}>
                <boxGeometry args={[DOOR_W + 0.24, DOOR_H + 0.18, 0.1]} />
                <meshStandardMaterial color="#6b4a3a" />
              </mesh>
              {/* 문짝 */}
              <mesh position={[0, DOOR_H / 2, 0.09]}>
                <boxGeometry args={[DOOR_W, DOOR_H, 0.06]} />
                <meshStandardMaterial color={ready ? '#a8704a' : '#8d7464'} roughness={0.8} />
              </mesh>
              {/* 문 유리창 */}
              <mesh position={[0, DOOR_H * 0.7, 0.125]}>
                <planeGeometry args={[0.7, 0.55]} />
                <meshStandardMaterial
                  color="#ffe2b0"
                  emissive="#ffc777"
                  emissiveIntensity={ready ? 0.6 + glow * 0.8 : 0.15}
                  toneMapped={false}
                />
              </mesh>
              {/* 손잡이 */}
              <mesh position={[0.45, 1.05, 0.14]}>
                <sphereGeometry args={[0.05, 8, 6]} />
                <meshStandardMaterial color="#e2c27a" metalness={0.4} roughness={0.4} />
              </mesh>
            </group>
            {/* 문 위 작은 등 */}
            <mesh position={[0, DOOR_H + 0.42, 0.15]}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshStandardMaterial color="#fff0c8" emissive="#ffd27a" emissiveIntensity={0.4 + glow} toneMapped={false} />
            </mesh>
            {/* 문 앞 계단 */}
            <mesh position={[0, 0.06, 0.45]}>
              <boxGeometry args={[DOOR_W + 0.6, 0.12, 0.7]} />
              <meshStandardMaterial color="#b4a597" />
            </mesh>
            {/* 문패 */}
            <Html portal={labelLayer} position={[0, DOOR_H + 0.8, 0.2]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
              <div className={`door-sign ${ready ? '' : 'soon'}`}>
                {door.label}
                {!ready && <span>준비 중</span>}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
