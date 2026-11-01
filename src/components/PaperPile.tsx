import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PILE, SHEET_THICKNESS } from '../data/classroom'
import { DAILY_PAPERS, MAX_CUSTOM_PAPERS, type TaskLabel } from '../data/tasks'
import { hoverCursor, useDispose } from '../hooks/useDispose'

/** 기본 20장 + 내가 추가한 서류까지 쌓을 수 있는 최대 장수 */
const CAPACITY = DAILY_PAPERS + MAX_CUSTOM_PAPERS

type Props = {
  remaining: number
  custom: number
  topLabel: TaskLabel | null
  onFling: () => void
  labelLayer: RefObject<HTMLDivElement>
}

/** 내 책상 위 서류 더미: 남은 장수만큼 종이가 쌓임 (종이 20장 = 인스턴스 하나) */
export function PaperPile({ remaining, custom, topLabel, onFling, labelLayer }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const { geo, mat } = useMemo(
    () => ({
      geo: new THREE.BoxGeometry(0.3, SHEET_THICKNESS * 0.9, 0.42),
      mat: new THREE.MeshStandardMaterial({ color: '#fbf8f0', roughness: 0.9 }),
    }),
    [],
  )
  useDispose(geo, mat)

  // 종이마다 살짝 비뚤게 (매번 같은 모양)
  useEffect(() => {
    const im = ref.current
    if (!im) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let i = 0; i < CAPACITY; i++) {
      const jitter = Math.sin(i * 12.9898) * 0.5
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), jitter * 0.12)
      m.compose(new THREE.Vector3(jitter * 0.02, SHEET_THICKNESS * (i + 0.5), Math.cos(i * 7.1) * 0.012), q, new THREE.Vector3(1, 1, 1))
      im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  }, [])

  useEffect(() => {
    if (ref.current) ref.current.count = Math.min(remaining, CAPACITY)
  }, [remaining])

  const top = SHEET_THICKNESS * remaining
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onFling()
  }

  return (
    <group position={[PILE.x, PILE.y, PILE.z]}>
      <instancedMesh ref={ref} args={[geo, mat, CAPACITY]} />
      {/* 맨 위 서류의 색 띠 (라벨) */}
      {topLabel && (
        <mesh position={[0, top + 0.002, -0.17]}>
          <boxGeometry args={[0.3, 0.004, 0.06]} />
          <meshStandardMaterial color={topLabel.color} />
        </mesh>
      )}
      {/* 누르기 쉬운 보이지 않는 넓은 영역 */}
      <mesh position={[0, 0.2, 0]} visible={false} onClick={click} {...hoverCursor}>
        <boxGeometry args={[0.7, 0.5, 0.7]} />
      </mesh>
      <Html portal={labelLayer} position={[0, top + 0.45, 0]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`pile-tag ${remaining === 0 ? 'done' : ''}`}>
          {remaining > 0 ? (
            <>
              📄 남은 서류 <strong>{remaining}</strong>장{custom > 0 && <em>내 서류 {custom}</em>}
              {topLabel && <span>맨 위: {topLabel.name}</span>}
            </>
          ) : (
            <>✨ 내일 또 쌓일 거예요</>
          )}
        </div>
      </Html>
    </group>
  )
}

/** 더미 맨 위 서류의 월드 위치 (날리기 시작점) */
export function pileTop(remaining: number) {
  return new THREE.Vector3(PILE.x, PILE.y + SHEET_THICKNESS * remaining + 0.01, PILE.z)
}
