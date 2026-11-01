import { useEffect, useMemo, type RefObject } from 'react'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import {
  BLACKBOARD,
  CLASS_LAMPS,
  CLASS_PLANTS,
  CLASS_ROOM,
  CLASS_WINDOWS,
  LECTERN,
  LOCKERS,
  MY_DESK,
  OPEN_WINDOW_Z,
  SHREDDER,
  STUDENT_DESKS,
} from '../data/classroom'
import { SCENES, type Door } from '../data/scenes'
import { quoteOfDay } from '../data/quotes'
import { todayKey } from '../hooks/clock'
import type { Sky } from '../hooks/useTimeOfDay'
import { useDispose } from '../hooks/useDispose'
import { BulletinBoard, OnWall, Plants, RoomDoor, RoomShell, WOOD_DARK, WallClock, WindowView } from './RoomParts'

const FONT = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif"

/** 긴 문장을 칠판 폭에 맞게 줄바꿈 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

/** 초록 칠판 + "오늘의 한마디" (캔버스로 그린 글씨, 외부 텍스처 파일 없음) */
function Blackboard() {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1400
    canvas.height = 300
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return { canvas, texture }
  }, [])
  useDispose(texture)

  useEffect(() => {
    const draw = () => {
      const ctx = canvas.getContext('2d')!
      const { width: W, height: H } = canvas
      ctx.fillStyle = '#2f5a45'
      ctx.fillRect(0, 0, W, H)
      // 지난 분필 자국 (희미하게)
      ctx.fillStyle = 'rgba(255,255,255,0.035)'
      for (let i = 0; i < 18; i++) ctx.fillRect((i * 173) % W, (i * 71) % H, 140, 22)
      const d = new Date(todayKey() + 'T00:00:00')
      ctx.font = `600 30px ${FONT}`
      ctx.fillStyle = 'rgba(255, 236, 150, 0.9)'
      ctx.textAlign = 'left'
      ctx.fillText('오늘의 한마디', 44, 58)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(`${d.getMonth() + 1}월 ${d.getDate()}일`, W - 44, 58)
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.93)'
      ctx.font = `700 64px ${FONT}`
      const lines = wrap(ctx, quoteOfDay(todayKey()), W - 160)
      const startY = H / 2 + 40 - ((lines.length - 1) * 74) / 2
      lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * 74))
      texture.needsUpdate = true
    }
    draw()
    // 웹폰트가 늦게 오면 다시 그림
    document.fonts?.ready.then(draw).catch(() => {})
  }, [canvas, texture])

  const { w, h } = BLACKBOARD
  return (
    <group>
      <mesh position-z={0.03}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.95} />
      </mesh>
      {/* 나무 테두리 */}
      {[
        [0, h / 2 + 0.06, w + 0.24, 0.12],
        [0, -h / 2 - 0.06, w + 0.24, 0.12],
        [-w / 2 - 0.06, 0, 0.12, h],
        [w / 2 + 0.06, 0, 0.12, h],
      ].map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, 0.04]}>
          <boxGeometry args={[bw, bh, 0.06]} />
          <meshStandardMaterial color="#8a6040" />
        </mesh>
      ))}
      {/* 분필 받침대 + 분필 */}
      <mesh position={[0, -h / 2 - 0.14, 0.1]}>
        <boxGeometry args={[w * 0.9, 0.04, 0.14]} />
        <meshStandardMaterial color="#8a6040" />
      </mesh>
      {[-2.2, -2.0, 1.6].map((x, i) => (
        <mesh key={x} position={[x, -h / 2 - 0.1, 0.1]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.012, 0.012, 0.09, 6]} />
          <meshStandardMaterial color={['#ffffff', '#ffe08a', '#ff9e9e'][i]} />
        </mesh>
      ))}
      {/* 칠판지우개 (받침대 위) */}
      <mesh position={[2.4, -h / 2 - 0.09, 0.1]}>
        <boxGeometry args={[0.22, 0.06, 0.08]} />
        <meshStandardMaterial color="#4a5a8a" />
      </mesh>
    </group>
  )
}

/** 학생 책상·의자 16세트 (인스턴싱) */
function StudentDesks() {
  return (
    <group>
      <Instances limit={STUDENT_DESKS.length}>
        <boxGeometry args={[0.66, 0.04, 0.46]} />
        <meshStandardMaterial color="#e2c79c" roughness={0.8} />
        {STUDENT_DESKS.map((d, i) => (
          <Instance key={i} position={[d.x, 0.66, d.z]} />
        ))}
      </Instances>
      {/* 책상 철제 다리 (앞·뒤 판) */}
      <Instances limit={STUDENT_DESKS.length * 2}>
        <boxGeometry args={[0.62, 0.62, 0.03]} />
        <meshStandardMaterial color="#8d939c" />
        {STUDENT_DESKS.flatMap((d, i) => [
          <Instance key={`f${i}`} position={[d.x, 0.33, d.z - 0.2]} />,
          <Instance key={`b${i}`} position={[d.x, 0.45, d.z + 0.2]} scale={[1, 0.3, 1]} />,
        ])}
      </Instances>
      {/* 의자 좌석 + 등받이 */}
      <Instances limit={STUDENT_DESKS.length}>
        <boxGeometry args={[0.4, 0.04, 0.38]} />
        <meshStandardMaterial color="#d8a86e" />
        {STUDENT_DESKS.map((d, i) => (
          <Instance key={i} position={[d.x, 0.4, d.z + 0.5]} />
        ))}
      </Instances>
      <Instances limit={STUDENT_DESKS.length}>
        <boxGeometry args={[0.4, 0.3, 0.03]} />
        <meshStandardMaterial color="#d8a86e" />
        {STUDENT_DESKS.map((d, i) => (
          <Instance key={i} position={[d.x, 0.62, d.z + 0.68]} />
        ))}
      </Instances>
      {/* 의자 다리 (가운데 기둥 하나로 단순화) */}
      <Instances limit={STUDENT_DESKS.length}>
        <cylinderGeometry args={[0.025, 0.025, 0.38, 6]} />
        <meshStandardMaterial color="#8d939c" />
        {STUDENT_DESKS.map((d, i) => (
          <Instance key={i} position={[d.x, 0.19, d.z + 0.5]} />
        ))}
      </Instances>
    </group>
  )
}

/** 사물함: 큰 상자 + 칸마다 색 문 (인스턴싱) */
function Lockers() {
  const { x, z1, z2, h, d } = LOCKERS
  const len = z2 - z1
  const cols = 8
  const doors = useMemo(() => {
    const list: { z: number; y: number; c: string }[] = []
    const palette = ['#ffd6a5', '#a0c4ff', '#caffbf', '#ffadad', '#bdb2ff', '#fdffb6']
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < cols; c++) list.push({ z: z1 + (c + 0.5) * (len / cols), y: (r + 0.5) * (h / 2), c: palette[(r * 3 + c) % palette.length] })
    return list
  }, [z1, len, h])
  return (
    <group>
      <mesh position={[x, h / 2, (z1 + z2) / 2]}>
        <boxGeometry args={[d, h, len]} />
        <meshStandardMaterial color="#c9a77c" />
      </mesh>
      <Instances limit={doors.length}>
        <boxGeometry args={[0.02, h / 2 - 0.08, len / cols - 0.08]} />
        <meshStandardMaterial color="#ffffff" />
        {doors.map((dd, i) => (
          <Instance key={i} position={[x - d / 2 - 0.01, dd.y, dd.z]} color={dd.c} />
        ))}
      </Instances>
    </group>
  )
}

type Props = { sky: Sky; onDoor: (door: Door) => void; labelLayer: RefObject<HTMLDivElement> }

/** 교실 전체: 방, 칠판, 교탁, 학생 책상, 사물함, 게시판, 시계, 창문, 화분, 내 업무 책상, 파쇄기 */
export function ClassroomRoom({ sky, onDoor, labelLayer }: Props) {
  const R = CLASS_ROOM
  const door = SCENES.classroom.doors[0]
  return (
    <group>
      <RoomShell room={R} floor="#c08b5c" plank="#a37349" />

      {/* 형광등 (빛은 장면의 pointLight 2개) */}
      {/* 아래쪽 면만 보이는 판이라 위에서 내려다보는 카메라를 가리지 않음 */}
      <Instances limit={CLASS_LAMPS.length}>
        <planeGeometry args={[1.4, 0.28]} />
        <meshStandardMaterial color="#fffaf0" emissive="#fff1d0" emissiveIntensity={1.2} toneMapped={false} />
        {CLASS_LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, R.height - 0.02, l.z]} rotation-x={Math.PI / 2} />
        ))}
      </Instances>

      <OnWall position={[BLACKBOARD.x, BLACKBOARD.y, R.minZ]} rotY={0}>
        <Blackboard />
      </OnWall>
      <OnWall position={[0, 2.82, R.minZ]} rotY={0}>
        <WallClock />
      </OnWall>
      {/* 왼쪽 벽 큰 창문 3개 (가운데는 열린 창) */}
      {CLASS_WINDOWS.map((z) => (
        <OnWall key={z} position={[R.minX, 1.75, z]} rotY={Math.PI / 2}>
          <WindowView sky={sky} w={2.8} h={1.6} open={z === OPEN_WINDOW_Z} />
        </OnWall>
      ))}
      {/* 오른쪽 벽 뒤쪽: 게시판 + 사물함 */}
      <OnWall position={[R.maxX - 0.04, 2.15, (LOCKERS.z1 + LOCKERS.z2) / 2]} rotY={-Math.PI / 2}>
        <BulletinBoard w={4.4} h={1.0} />
      </OnWall>
      <Lockers />
      <StudentDesks />

      {/* 교탁 */}
      <group position={[LECTERN.x, 0, LECTERN.z]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.0, 1.0, 0.55]} />
          <meshStandardMaterial color="#a8764e" />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[1.1, 0.05, 0.62]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        <mesh position={[0, 0.55, 0.28]}>
          <boxGeometry args={[0.7, 0.5, 0.02]} />
          <meshStandardMaterial color="#c9935f" />
        </mesh>
      </group>

      {/* 내 업무 책상 (교탁 옆) + 의자 + 모니터 + 컵 */}
      <group position={[MY_DESK.x, 0, MY_DESK.z]}>
        <mesh position={[0, 0.74, 0]}>
          <boxGeometry args={[1.5, 0.05, 0.72]} />
          <meshStandardMaterial color="#d9b98f" />
        </mesh>
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} position={[x, 0.36, 0]}>
            <boxGeometry args={[0.05, 0.72, 0.68]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
        ))}
        <mesh position={[-0.3, 0.98, -0.2]}>
          <boxGeometry args={[0.55, 0.36, 0.04]} />
          <meshStandardMaterial color="#2c2a33" roughness={0.5} />
        </mesh>
        <mesh position={[-0.65, 0.82, 0.18]}>
          <cylinderGeometry args={[0.045, 0.04, 0.11, 10]} />
          <meshStandardMaterial color="#ffd6a5" />
        </mesh>
        <mesh position={[0, 0.45, -0.62]}>
          <boxGeometry args={[0.46, 0.07, 0.44]} />
          <meshStandardMaterial color="#5b6475" />
        </mesh>
        <mesh position={[0, 0.75, -0.84]}>
          <boxGeometry args={[0.44, 0.5, 0.06]} />
          <meshStandardMaterial color="#5b6475" />
        </mesh>
      </group>

      {/* 파쇄기: 상자 + 투입구 + 초록 불 */}
      <group position={[SHREDDER.x, 0, SHREDDER.z]} name="shredder">
        <mesh position={[0, SHREDDER.h / 2, 0]}>
          <boxGeometry args={[0.55, SHREDDER.h, 0.42]} />
          <meshStandardMaterial color="#3b3f4a" roughness={0.6} />
        </mesh>
        <mesh position={[0, SHREDDER.h + 0.005, 0]}>
          <boxGeometry args={[0.42, 0.012, 0.05]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
        <mesh position={[0.18, SHREDDER.h - 0.08, 0.215]}>
          <sphereGeometry args={[0.02, 8, 6]} />
          <meshStandardMaterial color="#7dff9a" emissive="#4cff7a" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.22, 0.212]}>
          <planeGeometry args={[0.4, 0.2]} />
          <meshStandardMaterial color="#5a5f6b" />
        </mesh>
      </group>

      <Plants list={CLASS_PLANTS} />
      <RoomDoor door={door} onDoor={onDoor} labelLayer={labelLayer} />
    </group>
  )
}
