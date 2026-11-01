import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html, Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { BOOKSHELVES, LAB_CHAIRS, LAB_LAMPS, LAB_OBJECTS, LAB_PLANTS, LAB_ROOM, LAB_WINDOWS, WORK_TABLE, type LabObject } from '../data/lab'
import { BOARDS, SEED_POSTS, type BoardId } from '../data/boards'
import { SCENES, type Door } from '../data/scenes'
import type { Sky } from '../hooks/useTimeOfDay'
import { player } from '../hooks/playerStore'
import { hoverCursor, useDispose } from '../hooks/useDispose'
import { CeilingLamps, OnWall, Plants, RoomDoor, RoomShell, WOOD_DARK, WindowView } from './RoomParts'

const FONT = "'Gaegu', 'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', sans-serif"
const NEAR = 3.4

/**
 * 상호작용 오브젝트 공통: 누르면 onOpen, 가까이 가면 테두리가 반짝이고 말풍선 아이콘이 커짐
 */
function Interactive({
  obj,
  onOpen,
  labelLayer,
  glow,
  labelY,
  children,
}: {
  obj: LabObject
  onOpen: (b: BoardId) => void
  labelLayer: RefObject<HTMLDivElement>
  /** 반짝일 테두리 (w, h, 위치) */
  glow: { w: number; h: number; y: number; z?: number }
  labelY: number
  children: ReactNode
}) {
  const [near, setNear] = useState(false)
  const nearRef = useRef(false)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const wx = obj.x
  const wz = obj.z
  useFrame((state) => {
    const d = Math.hypot(player.position.x - wx, player.position.z - wz)
    const n = d < NEAR
    if (n !== nearRef.current) {
      nearRef.current = n
      setNear(n)
    }
    if (mat.current) {
      const t = state.clock.elapsedTime
      mat.current.opacity = n ? 0.45 + 0.35 * Math.sin(t * 4) : 0.12 + 0.08 * Math.sin(t * 1.5)
    }
  })
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onOpen(obj.board)
  }
  const cfg = BOARDS[obj.board]
  return (
    <group position={[obj.x, obj.y, obj.z]} rotation-y={obj.rotY}>
      <group onClick={click} {...hoverCursor}>
        {children}
      </group>
      {/* 반짝이는 테두리 (뒤쪽에 살짝 큰 판) */}
      <mesh position={[0, glow.y, glow.z ?? 0.005]}>
        <planeGeometry args={[glow.w + 0.22, glow.h + 0.22]} />
        <meshBasicMaterial ref={mat} color="#ffd98a" transparent opacity={0.15} depthWrite={false} toneMapped={false} />
      </mesh>
      <Html portal={labelLayer} position={[0, labelY, 0.3]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`lab-hint ${near ? 'near' : ''}`}>
          <span className="lab-hint-emoji">{near ? '💬' : cfg.emoji}</span>
          {cfg.title}
          {near && <span className="lab-hint-sub">눌러서 열기</span>}
        </div>
      </Html>
    </group>
  )
}

/** 칠판: 캔버스로 그린 분필 글씨 (시드 글 몇 줄) */
function ChalkBoard() {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 340
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return { canvas, texture }
  }, [])
  useDispose(texture)
  useEffect(() => {
    const draw = () => {
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#2d5643'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      for (let i = 0; i < 14; i++) ctx.fillRect((i * 151) % 1024, (i * 67) % 340, 130, 20)
      ctx.fillStyle = 'rgba(255, 236, 150, 0.92)'
      ctx.font = `700 40px ${FONT}`
      ctx.fillText('오늘의 한마디', 40, 62)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = `400 42px ${FONT}`
      SEED_POSTS.chalk.slice(0, 4).forEach((p, i) => ctx.fillText(`· ${p.text}`, 52, 128 + i * 56))
      texture.needsUpdate = true
    }
    draw()
    document.fonts?.ready.then(draw).catch(() => {})
  }, [canvas, texture])
  return (
    <group>
      <mesh position-z={0.03}>
        <planeGeometry args={[4.6, 1.5]} />
        <meshStandardMaterial map={texture} roughness={0.95} />
      </mesh>
      {[
        [0, 0.81, 4.84, 0.12],
        [0, -0.81, 4.84, 0.12],
        [-2.36, 0, 0.12, 1.5],
        [2.36, 0, 0.12, 1.5],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.045]}>
          <boxGeometry args={[w, h, 0.06]} />
          <meshStandardMaterial color="#8a6040" />
        </mesh>
      ))}
      <mesh position={[0, -0.92, 0.1]}>
        <boxGeometry args={[4.2, 0.04, 0.14]} />
        <meshStandardMaterial color="#8a6040" />
      </mesh>
    </group>
  )
}

/** 메모보드: 코르크판 + 색색의 포스트잇 */
function MemoBoard() {
  const notes = useMemo(() => {
    const colors = ['#ffe58a', '#ffc1cf', '#bfeedd', '#bfe0ff']
    const list: { x: number; y: number; c: string; r: number }[] = []
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 5; c++) {
        if ((r * 5 + c) % 7 === 4) continue
        list.push({ x: -1.25 + c * 0.62 + (r % 2) * 0.08, y: 0.48 - r * 0.48, c: colors[(r * 2 + c) % 4], r: ((r * 5 + c) % 5) * 0.05 - 0.1 })
      }
    return list
  }, [])
  return (
    <group>
      <mesh position-z={0.03}>
        <boxGeometry args={[3.2, 1.6, 0.05]} />
        <meshStandardMaterial color="#c79a68" roughness={1} />
      </mesh>
      {[
        [0, 0.84, 3.36, 0.1],
        [0, -0.84, 3.36, 0.1],
        [-1.65, 0, 0.1, 1.6],
        [1.65, 0, 0.1, 1.6],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.06]}>
          <boxGeometry args={[w, h, 0.05]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      <Instances limit={notes.length}>
        <planeGeometry args={[0.42, 0.4]} />
        <meshStandardMaterial color="#ffffff" />
        {notes.map((n, i) => (
          <Instance key={i} position={[n.x, n.y, 0.065]} rotation-z={n.r} color={n.c} />
        ))}
      </Instances>
      <Instances limit={notes.length}>
        <sphereGeometry args={[0.025, 6, 4]} />
        <meshStandardMaterial color="#e05a5a" />
        {notes.map((n, i) => (
          <Instance key={i} position={[n.x, n.y + 0.15, 0.08]} />
        ))}
      </Instances>
    </group>
  )
}

/** 냉장고: 2도어 + 손잡이 + 자석 + 메모 */
function Fridge() {
  const H = 1.9
  return (
    <group>
      <mesh position={[0, H / 2, -0.37]}>
        <boxGeometry args={[0.86, H, 0.72]} />
        <meshStandardMaterial color="#dfeee9" roughness={0.5} />
      </mesh>
      {/* 위·아래 문 경계 */}
      <mesh position={[0, 1.22, 0.003]}>
        <boxGeometry args={[0.86, 0.02, 0.02]} />
        <meshStandardMaterial color="#9fb5ae" />
      </mesh>
      {[1.55, 0.75].map((y) => (
        <mesh key={y} position={[0.33, y, 0.03]}>
          <boxGeometry args={[0.04, 0.32, 0.04]} />
          <meshStandardMaterial color="#c8d4d0" metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
      {/* 메모 + 자석 */}
      {[
        [-0.18, 1.55, '#fffaf0', -0.08],
        [0.02, 1.42, '#ffe58a', 0.1],
        [-0.15, 0.9, '#ffc1cf', 0.05],
        [0.05, 0.62, '#bfe0ff', -0.06],
      ].map(([x, y, c, r], i) => (
        <group key={i} position={[x as number, y as number, 0.012]} rotation-z={r as number}>
          <mesh>
            <planeGeometry args={[0.24, 0.24]} />
            <meshStandardMaterial color={c as string} />
          </mesh>
          <mesh position={[0, 0.1, 0.012]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 10]} />
            <meshStandardMaterial color={['#e05a5a', '#4a86e0', '#5bb07a', '#f2a65a'][i]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** 책장 2개: 선반 + 색색 책 (인스턴싱) */
function Bookshelves() {
  const books = useMemo(() => {
    const list: { x: number; y: number; z: number; h: number; c: string }[] = []
    const colors = ['#c0504d', '#4f81bd', '#9bbb59', '#f2a65a', '#8064a2', '#4bacc6', '#d9c27a', '#7a5a45']
    BOOKSHELVES.forEach((s, si) => {
      for (let shelf = 0; shelf < 4; shelf++) {
        let x = s.x - 0.95
        let k = si * 17 + shelf * 5
        while (x < s.x + 0.85) {
          const w = 0.07 + ((k * 13) % 5) * 0.015
          const h = 0.32 + ((k * 7) % 4) * 0.04
          if ((k * 11) % 9 !== 0) list.push({ x: x + w / 2, y: 0.18 + shelf * 0.55 + h / 2, z: s.z, h, c: colors[k % colors.length] })
          x += w + 0.01
          k++
        }
      }
    })
    return list
  }, [])
  return (
    <group>
      {BOOKSHELVES.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <mesh position={[0, 1.15, -0.2]}>
            <boxGeometry args={[2.1, 2.3, 0.04]} />
            <meshStandardMaterial color="#8a5f3e" />
          </mesh>
          {[-1.03, 1.03].map((x) => (
            <mesh key={x} position={[x, 1.15, 0]}>
              <boxGeometry args={[0.05, 2.3, 0.44]} />
              <meshStandardMaterial color="#a8764e" />
            </mesh>
          ))}
          {[0.15, 0.7, 1.25, 1.8, 2.28].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <boxGeometry args={[2.06, 0.04, 0.44]} />
              <meshStandardMaterial color="#a8764e" />
            </mesh>
          ))}
        </group>
      ))}
      <Instances limit={books.length}>
        <boxGeometry args={[1, 1, 0.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
        {books.map((b, i) => (
          <Instance key={i} position={[b.x, b.y, b.z]} scale={[0.08, b.h, 1]} color={b.c} />
        ))}
      </Instances>
    </group>
  )
}

/** 큰 작업 테이블 + 노트북 + 머그컵 + 종이 + 의자 4개 */
function WorkTable() {
  const { x, z, w, d } = WORK_TABLE
  return (
    <group>
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.76, 0]}>
          <boxGeometry args={[w, 0.06, d]} />
          <meshStandardMaterial color="#c99b6b" roughness={0.7} />
        </mesh>
        {[
          [-w / 2 + 0.12, -d / 2 + 0.12],
          [w / 2 - 0.12, -d / 2 + 0.12],
          [-w / 2 + 0.12, d / 2 - 0.12],
          [w / 2 - 0.12, d / 2 - 0.12],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.37, lz]}>
            <boxGeometry args={[0.08, 0.74, 0.08]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
        ))}
        {/* 노트북 2대 */}
        {[
          [-0.8, -0.3, 0],
          [0.9, 0.35, Math.PI],
        ].map(([lx, lz, r], i) => (
          <group key={i} position={[lx, 0.8, lz]} rotation-y={r}>
            <mesh>
              <boxGeometry args={[0.5, 0.02, 0.34]} />
              <meshStandardMaterial color="#b9bec6" metalness={0.3} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.16, -0.17]} rotation-x={-0.25}>
              <boxGeometry args={[0.5, 0.32, 0.015]} />
              <meshStandardMaterial color="#b9bec6" metalness={0.3} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.16, -0.16]} rotation-x={-0.25}>
              <planeGeometry args={[0.44, 0.27]} />
              <meshStandardMaterial color="#cfe3ff" emissive="#8fb8f0" emissiveIntensity={0.6} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* 머그컵 */}
        {[
          [-0.3, -0.45, '#f2a65a'],
          [0.35, 0.5, '#4ab0d9'],
          [1.4, -0.4, '#ffffff'],
        ].map(([lx, lz, c], i) => (
          <group key={i} position={[lx as number, 0.85, lz as number]}>
            <mesh>
              <cylinderGeometry args={[0.055, 0.05, 0.12, 12]} />
              <meshStandardMaterial color={c as string} />
            </mesh>
            <mesh position={[0.065, 0, 0]} rotation-y={Math.PI / 2}>
              <torusGeometry args={[0.03, 0.01, 6, 10]} />
              <meshStandardMaterial color={c as string} />
            </mesh>
          </group>
        ))}
        {/* 종이·공책 */}
        {[
          [0.1, -0.2, 0.2, '#fbf8f0'],
          [-1.4, 0.4, -0.3, '#ffe58a'],
          [1.2, 0.1, 0.1, '#bfeedd'],
        ].map(([lx, lz, r, c], i) => (
          <mesh key={i} position={[lx as number, 0.795, lz as number]} rotation-y={r as number}>
            <boxGeometry args={[0.3, 0.01, 0.4]} />
            <meshStandardMaterial color={c as string} />
          </mesh>
        ))}
      </group>
      {/* 의자 */}
      {LAB_CHAIRS.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation-y={c.rotY}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.46, 0.06, 0.44]} />
            <meshStandardMaterial color="#6f8a7a" />
          </mesh>
          <mesh position={[0, 0.75, -0.22]}>
            <boxGeometry args={[0.44, 0.5, 0.05]} />
            <meshStandardMaterial color="#6f8a7a" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.42, 6]} />
            <meshStandardMaterial color="#9aa0a8" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

type Props = { sky: Sky; onDoor: (door: Door) => void; onOpen: (b: BoardId) => void; labelLayer: RefObject<HTMLDivElement> }

/** 연구실 전체 */
export function LabRoom({ sky, onDoor, onOpen, labelLayer }: Props) {
  const R = LAB_ROOM
  const door = SCENES.lab.doors[0]
  return (
    <group>
      <RoomShell room={R} floor="#a97a52" plank="#8f6440" />
      <CeilingLamps list={LAB_LAMPS} height={R.height} />
      {LAB_WINDOWS.map((z) => (
        <OnWall key={z} position={[R.minX, 1.75, z]} rotY={Math.PI / 2}>
          <WindowView sky={sky} w={2.2} h={1.4} />
        </OnWall>
      ))}
      {/* 러그 */}
      <mesh rotation-x={-Math.PI / 2} position={[WORK_TABLE.x, 0.006, WORK_TABLE.z]}>
        <planeGeometry args={[5.6, 3.8]} />
        <meshStandardMaterial color="#b65d55" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[WORK_TABLE.x, 0.008, WORK_TABLE.z]}>
        <planeGeometry args={[5.0, 3.2]} />
        <meshStandardMaterial color="#d98a6f" roughness={1} />
      </mesh>
      <Bookshelves />
      <WorkTable />
      <Plants list={LAB_PLANTS} />

      <Interactive obj={LAB_OBJECTS.chalk} onOpen={onOpen} labelLayer={labelLayer} glow={{ w: 4.84, h: 1.62, y: 0 }} labelY={1.15}>
        <ChalkBoard />
      </Interactive>
      <Interactive obj={LAB_OBJECTS.memo} onOpen={onOpen} labelLayer={labelLayer} glow={{ w: 3.36, h: 1.7, y: 0 }} labelY={1.1}>
        <MemoBoard />
      </Interactive>
      <Interactive obj={LAB_OBJECTS.fridge} onOpen={onOpen} labelLayer={labelLayer} glow={{ w: 0.86, h: 1.9, y: 0.95, z: 0.02 }} labelY={2.3}>
        <Fridge />
      </Interactive>

      <RoomDoor door={door} onDoor={onDoor} labelLayer={labelLayer} />
    </group>
  )
}
