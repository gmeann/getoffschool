import { useEffect, useMemo, type RefObject } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Html, Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { CABINETS, CEILING_LAMPS, DESKS, PLANTS, ROOM, WATER, WINDOWS, chairOf } from '../data/office'
import { SCENES, type Door } from '../data/scenes'
import type { Sky } from '../hooks/useTimeOfDay'
import { hoverCursor, useDispose } from '../hooks/useDispose'

const FLOOR = '#b98458'
const WALL = '#f3ead8'
const WOOD_DARK = '#7b5236'
const DESK_TOP = '#d9b98f'
const METAL = '#9aa0a8'

/** 창밖 풍경: 하늘 시간대 색을 그대로 쓰는 그라데이션 + 먼 산 실루엣 */
function WindowView({ x, sky }: { x: number; sky: Sky }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: false,
        uniforms: {
          top: { value: new THREE.Color() },
          mid: { value: new THREE.Color() },
          bottom: { value: new THREE.Color() },
          hill: { value: new THREE.Color('#3d2f55') },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 hill;
          varying vec2 vUv;
          void main() {
            vec3 c = mix(bottom, mid, smoothstep(0.15, 0.55, vUv.y));
            c = mix(c, top, smoothstep(0.5, 1.0, vUv.y));
            // 먼 산 능선
            float ridge = 0.2 + 0.07 * sin(vUv.x * 9.0 + 1.3) + 0.04 * sin(vUv.x * 23.0);
            if (vUv.y < ridge) c = mix(hill, bottom, 0.25);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  useDispose(material)
  useEffect(() => {
    material.uniforms.top.value.copy(sky.skyTop)
    material.uniforms.mid.value.copy(sky.skyMid)
    material.uniforms.bottom.value.copy(sky.skyBottom)
    material.uniforms.hill.value.copy(sky.fog).multiplyScalar(0.45)
  }, [material, sky])

  return (
    <group position={[x, 1.75, ROOM.minZ + 0.02]}>
      <mesh material={material}>
        <planeGeometry args={[2.8, 1.35]} />
      </mesh>
      {/* 창틀 + 가운데 창살 */}
      {[
        [0, 0.72, 3.0, 0.1],
        [0, -0.72, 3.0, 0.1],
        [-1.45, 0, 0.1, 1.5],
        [1.45, 0, 0.1, 1.5],
        [0, 0, 0.06, 1.4],
      ].map(([px, py, w, h], i) => (
        <mesh key={i} position={[px, py, 0.03]}>
          <boxGeometry args={[w, h, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      ))}
      {/* 창턱 */}
      <mesh position={[0, -0.8, 0.1]}>
        <boxGeometry args={[3.1, 0.06, 0.22]} />
        <meshStandardMaterial color="#e6dccb" />
      </mesh>
    </group>
  )
}

/** 벽시계: 실제 시각을 가리킴 (분 단위로 충분) */
function WallClock() {
  const now = new Date()
  const h = (now.getHours() % 12) + now.getMinutes() / 60
  const m = now.getMinutes()
  return (
    <group position={[0, 2.55, ROOM.minZ + 0.04]}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 24]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[0, 0, -0.005]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.35, 0.35, 0.04, 24]} />
        <meshStandardMaterial color="#5a4636" />
      </mesh>
      {/* 바늘: 한쪽 끝이 가운데에 고정되도록 그룹으로 회전 */}
      <group position={[0, 0, 0.035]} rotation-z={(-h / 12) * Math.PI * 2}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.035, 0.15, 0.01]} />
          <meshStandardMaterial color="#2a2233" />
        </mesh>
      </group>
      <group position={[0, 0, 0.042]} rotation-z={(-m / 60) * Math.PI * 2}>
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[0.022, 0.23, 0.01]} />
          <meshStandardMaterial color="#2a2233" />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.05]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.025, 0.025, 0.01, 10]} />
        <meshStandardMaterial color="#c0704a" />
      </mesh>
    </group>
  )
}

/** 게시판 (오른쪽 벽): 코르크판 + 알록달록 종이 */
function BulletinBoard() {
  const notes = [
    [-0.75, 0.25, '#ffd6a5'],
    [-0.2, 0.3, '#caffbf'],
    [0.4, 0.22, '#9bf6ff'],
    [0.85, 0.28, '#ffadad'],
    [-0.55, -0.25, '#fdffb6'],
    [0.1, -0.22, '#bdb2ff'],
    [0.7, -0.27, '#ffc6ff'],
  ] as const
  return (
    <group position={[ROOM.maxX - 0.04, 1.65, 0.8]} rotation-y={-Math.PI / 2}>
      <mesh>
        <boxGeometry args={[2.4, 1.2, 0.05]} />
        <meshStandardMaterial color="#c49a6c" roughness={1} />
      </mesh>
      {notes.map(([x, y, c], i) => (
        <mesh key={i} position={[x, y, 0.035]} rotation-z={(i % 3) * 0.06 - 0.06}>
          <planeGeometry args={[0.36, 0.36]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  )
}

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
  const { minX, maxX, minZ, maxZ, height } = ROOM
  const W = maxX - minX
  const D = maxZ - minZ
  const door = SCENES.office.doors[0]

  // 벽은 안쪽 면만 그림 → 카메라가 방 밖에 있어도 가까운 벽은 저절로 안 보임
  const walls: { pos: [number, number, number]; rotY: number; w: number }[] = [
    { pos: [0, height / 2, minZ], rotY: 0, w: W },
    { pos: [0, height / 2, maxZ], rotY: Math.PI, w: W },
    { pos: [minX, height / 2, 0], rotY: Math.PI / 2, w: D },
    { pos: [maxX, height / 2, 0], rotY: -Math.PI / 2, w: D },
  ]

  const plankLines = useMemo(() => Array.from({ length: 13 }, (_, i) => minZ + 1 + i), [minZ])

  const clickDoor = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onDoor(door)
  }

  return (
    <group>
      {/* 나무 바닥 + 마루 줄 */}
      <mesh rotation-x={-Math.PI / 2} name="floor">
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={FLOOR} roughness={0.85} />
      </mesh>
      <Instances limit={plankLines.length}>
        <planeGeometry args={[W, 0.03]} />
        <meshStandardMaterial color="#9a6b45" />
        {plankLines.map((z) => (
          <Instance key={z} position={[0, 0.003, z]} rotation-x={-Math.PI / 2} />
        ))}
      </Instances>

      {/* 벽 + 걸레받이 */}
      {walls.map((w, i) => (
        <group key={i} position={w.pos} rotation-y={w.rotY}>
          <mesh>
            <planeGeometry args={[w.w, height]} />
            <meshStandardMaterial color={WALL} roughness={0.95} />
          </mesh>
          <mesh position={[0, -height / 2 + 0.06, 0.01]}>
            <planeGeometry args={[w.w, 0.12]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
        </group>
      ))}
      {/* 천장: 아래쪽만 보이는 면 (위에서 내려다보는 카메라에는 안 보임) */}
      <mesh position={[0, height, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#f7f1e4" />
      </mesh>

      {/* 천장 등 (전구 모양) */}
      {CEILING_LAMPS.map((l, i) => (
        <group key={i} position={[l.x, height, l.z]}>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.5, 4]} />
            <meshStandardMaterial color="#3a3030" />
          </mesh>
          <mesh position={[0, -0.55, 0]}>
            <coneGeometry args={[0.32, 0.22, 12, 1, true]} />
            <meshStandardMaterial color="#e9d3b0" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.63, 0]}>
            <sphereGeometry args={[0.11, 10, 8]} />
            <meshStandardMaterial color="#fff2cf" emissive="#ffd38a" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {WINDOWS.map((x) => (
        <WindowView key={x} x={x} sky={sky} />
      ))}
      <WallClock />
      <BulletinBoard />
      <Desks />

      {/* 서류함 */}
      <Instances limit={CABINETS.length * 4}>
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

      {/* 화분 (재사용) */}
      <Instances limit={PLANTS.length}>
        <cylinderGeometry args={[0.24, 0.18, 0.4, 10]} />
        <meshStandardMaterial color="#c0704a" />
        {PLANTS.map((p, i) => (
          <Instance key={i} position={[p.x, 0.2, p.z]} />
        ))}
      </Instances>
      <Instances limit={PLANTS.length * 2}>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#5f8a4f" flatShading />
        {PLANTS.flatMap((p, i) => [
          <Instance key={`a${i}`} position={[p.x, 0.72, p.z]} />,
          <Instance key={`b${i}`} position={[p.x + 0.05, 1.05, p.z - 0.04]} scale={0.7} rotation-y={1} />,
        ])}
      </Instances>

      {/* 출입문 (왼쪽 벽) */}
      <group position={[door.x + 0.02, 0, door.z]} rotation-y={door.yaw}>
        <group onClick={clickDoor} {...hoverCursor}>
          <mesh position={[0, 1.15, 0.03]}>
            <boxGeometry args={[1.35, 2.4, 0.06]} />
            <meshStandardMaterial color="#6b4a3a" />
          </mesh>
          <mesh position={[0, 1.1, 0.07]}>
            <boxGeometry args={[1.12, 2.2, 0.04]} />
            <meshStandardMaterial color="#a8704a" />
          </mesh>
          <mesh position={[0, 1.6, 0.1]}>
            <planeGeometry args={[0.6, 0.5]} />
            <meshStandardMaterial color="#ffe2b0" emissive="#ffc777" emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
          <mesh position={[0.4, 1.0, 0.11]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color="#e2c27a" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
        <Html portal={labelLayer} position={[0, 2.75, 0.1]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
          <div className="door-sign">🚪 {door.label}</div>
        </Html>
      </group>
    </group>
  )
}
