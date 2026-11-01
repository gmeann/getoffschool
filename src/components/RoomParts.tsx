/** 교무실·교실이 함께 쓰는 실내 부품: 방 껍데기, 창밖 풍경, 벽시계, 게시판, 출입문, 화분 */
import { useEffect, useMemo, type ReactNode, type RefObject } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Html, Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import type { Door } from '../data/scenes'
import type { Sky } from '../hooks/useTimeOfDay'
import { hoverCursor, useDispose } from '../hooks/useDispose'

export type Room = { minX: number; maxX: number; minZ: number; maxZ: number; height: number }

export const WALL = '#f3ead8'
export const WOOD_DARK = '#7b5236'

/**
 * 바닥(이름 'floor' → 클릭 이동 대상), 벽 4면(안쪽 면만 그려서 카메라 쪽 벽은 저절로 안 보임),
 * 아래쪽만 보이는 천장, 걸레받이, 마루 줄
 */
export function RoomShell({ room, floor = '#b98458', plank = '#9a6b45' }: { room: Room; floor?: string; plank?: string }) {
  const { minX, maxX, minZ, maxZ, height } = room
  const W = maxX - minX
  const D = maxZ - minZ
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  const walls: { pos: [number, number, number]; rotY: number; w: number }[] = [
    { pos: [cx, height / 2, minZ], rotY: 0, w: W },
    { pos: [cx, height / 2, maxZ], rotY: Math.PI, w: W },
    { pos: [minX, height / 2, cz], rotY: Math.PI / 2, w: D },
    { pos: [maxX, height / 2, cz], rotY: -Math.PI / 2, w: D },
  ]
  const plankLines = useMemo(() => Array.from({ length: Math.floor(D) - 1 }, (_, i) => minZ + 1 + i), [minZ, D])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0, cz]} name="floor">
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={floor} roughness={0.85} />
      </mesh>
      <Instances limit={plankLines.length}>
        <planeGeometry args={[W, 0.03]} />
        <meshStandardMaterial color={plank} />
        {plankLines.map((z) => (
          <Instance key={z} position={[cx, 0.003, z]} rotation-x={-Math.PI / 2} />
        ))}
      </Instances>
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
      <mesh position={[cx, height, cz]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#f7f1e4" />
      </mesh>
    </group>
  )
}

/** 벽에 붙는 물건을 놓기 위한 그룹: 벽 안쪽 면 기준 위치와 방향 */
export function OnWall({ position, rotY, children }: { position: [number, number, number]; rotY: number; children: ReactNode }) {
  return (
    <group position={position} rotation-y={rotY}>
      {children}
    </group>
  )
}

/** 창밖 풍경: 하늘 시간대 색을 쓰는 그라데이션 + 먼 산 능선. 창틀 포함 */
export function WindowView({ sky, w = 2.8, h = 1.35, open = false }: { sky: Sky; w?: number; h?: number; open?: boolean }) {
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

  const hw = w / 2
  const hh = h / 2
  const frame: [number, number, number, number][] = [
    [0, hh + 0.05, w + 0.2, 0.1],
    [0, -hh - 0.05, w + 0.2, 0.1],
    [-hw - 0.05, 0, 0.1, h + 0.2],
    [hw + 0.05, 0, 0.1, h + 0.2],
  ]
  return (
    <group position-z={0.02}>
      <mesh material={material}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {frame.map(([px, py, fw, fh], i) => (
        <mesh key={i} position={[px, py, 0.03]}>
          <boxGeometry args={[fw, fh, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      ))}
      {open ? (
        // 열린 창: 창문 한 짝이 안쪽으로 열려 있음
        <mesh position={[hw * 0.5, 0, 0.32]} rotation-y={-1.0}>
          <boxGeometry args={[hw, h, 0.03]} />
          <meshStandardMaterial color="#dfeaf2" transparent opacity={0.45} />
        </mesh>
      ) : (
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[0.06, h, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      )}
      <mesh position={[0, -hh - 0.1, 0.1]}>
        <boxGeometry args={[w + 0.3, 0.06, 0.22]} />
        <meshStandardMaterial color="#e6dccb" />
      </mesh>
    </group>
  )
}

/** 벽시계: 실제 시각 (분 단위) */
export function WallClock() {
  const now = new Date()
  const h = (now.getHours() % 12) + now.getMinutes() / 60
  const m = now.getMinutes()
  return (
    <group position-z={0.04}>
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

/** 게시판: 코르크판 + 알록달록 종이 */
export function BulletinBoard({ w = 2.4, h = 1.2 }: { w?: number; h?: number }) {
  const colors = ['#ffd6a5', '#caffbf', '#9bf6ff', '#ffadad', '#fdffb6', '#bdb2ff', '#ffc6ff']
  const notes = useMemo(() => {
    const cols = Math.max(2, Math.round(w / 0.55))
    const list: [number, number, string][] = []
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < cols; c++) {
        if ((r * cols + c) % 5 === 3) continue
        list.push([-w / 2 + (c + 0.5) * (w / cols), r === 0 ? h * 0.22 : -h * 0.22, colors[(r * cols + c) % colors.length]])
      }
    return list
  }, [w, h])
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial color="#c49a6c" roughness={1} />
      </mesh>
      {notes.map(([x, y, c], i) => (
        <mesh key={i} position={[x, y, 0.035]} rotation-z={(i % 3) * 0.06 - 0.06}>
          <planeGeometry args={[0.34, 0.34]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  )
}

/** 출입문 (벽에 붙음, 누르면 onDoor) */
export function RoomDoor({ door, onDoor, labelLayer }: { door: Door; onDoor: (d: Door) => void; labelLayer: RefObject<HTMLDivElement> }) {
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onDoor(door)
  }
  // 문은 벽에서 방 안쪽으로 살짝 띄움
  const ox = Math.sin(door.yaw) * 0.02
  const oz = Math.cos(door.yaw) * 0.02
  return (
    <group position={[door.x + ox, 0, door.z + oz]} rotation-y={door.yaw}>
      <group onClick={click} {...hoverCursor}>
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
  )
}

/** 화분 여러 개 (재사용) */
export function Plants({ list, scale = 1 }: { list: { x: number; z: number }[]; scale?: number }) {
  return (
    <group scale={scale}>
      <Instances limit={list.length}>
        <cylinderGeometry args={[0.24, 0.18, 0.4, 10]} />
        <meshStandardMaterial color="#c0704a" />
        {list.map((p, i) => (
          <Instance key={i} position={[p.x / scale, 0.2, p.z / scale]} />
        ))}
      </Instances>
      <Instances limit={list.length * 2}>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#5f8a4f" flatShading />
        {list.flatMap((p, i) => [
          <Instance key={`a${i}`} position={[p.x / scale, 0.72, p.z / scale]} />,
          <Instance key={`b${i}`} position={[p.x / scale + 0.05, 1.05, p.z / scale - 0.04]} scale={0.7} rotation-y={1} />,
        ])}
      </Instances>
    </group>
  )
}

/** 천장 전등 모양 (빛은 장면에서 pointLight 로 따로) */
export function CeilingLamps({ list, height }: { list: { x: number; z: number }[]; height: number }) {
  return (
    <>
      {list.map((l, i) => (
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
    </>
  )
}
