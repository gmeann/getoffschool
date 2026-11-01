import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Heart } from '../services/heartService'
import { SKY_HEARTS_MAX } from '../data/hearts'
import { hoverCursor } from '../hooks/useDispose'
import { player } from '../hooks/playerStore'

/**
 * 운동장 하늘에 천천히 떠다니는 "나눈 마음" 구름 (최대 12개).
 * 구름 하나 = 둥근 덩어리 5개. 전부 InstancedMesh 하나로 그려서 그리기 호출 1번.
 * 글 내용은 구름에 쓰지 않고, 누르면 패널에서 텍스트로 보여 줌.
 */
const PUFFS: [number, number, number, number][] = [
  [0, 0, 0, 1.2],
  [-1.2, -0.2, 0.1, 0.9],
  [1.2, -0.15, 0, 0.95],
  [-0.5, 0.6, -0.1, 0.85],
  [0.6, 0.55, 0.1, 0.8],
]
const PER = PUFFS.length

/**
 * 구름 자리: 내 캐릭터 앞쪽(카메라가 보는 북쪽) 하늘 띠.
 * 카메라 각도가 고정이라 이 높이·거리여야 화면 위쪽에 보이고 건물에 가리지 않음.
 * 먼 하늘처럼 캐릭터를 아주 천천히 따라옴.
 */
/** 최신 구름일수록 화면 가운데 칸에 오도록: 가운데 → 바깥 순서 */
const COL_ORDER = [2, 3, 1, 4, 0, 5]
function slot(i: number) {
  const col = COL_ORDER[i % 6]
  const row = Math.floor(i / 6)
  return {
    x: -16 + col * 6.4 + (row ? 3.2 : 0) + Math.sin(i * 7.3) * 0.8,
    y: 4.55 + (i % 3) * 0.35 + row * 0.6,
    z: -19 - row * 4.5 + Math.cos(i * 3.1) * 1.2,
    s: 0.95 + (i % 4) * 0.1,
  }
}

type Props = { hearts: Heart[]; onOpen: (h: Heart) => void }

export function SharedHearts({ hearts, onOpen }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const list = hearts.slice(0, SKY_HEARTS_MAX)
  const res = useMemo(
    () => ({
      geo: new THREE.SphereGeometry(1, 12, 9),
      mat: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffd6e0', emissiveIntensity: 0.35, roughness: 1, fog: false }),
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      p: new THREE.Vector3(),
      sc: new THREE.Vector3(),
      c: new THREE.Color(),
      anchor: new THREE.Vector3(player.position.x, 0, player.position.z),
    }),
    [],
  )
  useEffect(
    () => () => {
      res.geo.dispose()
      res.mat.dispose()
    },
    [res],
  )

  // 내가 나눈 구름은 살짝 복숭아빛
  useEffect(() => {
    const im = ref.current
    if (!im) return
    list.forEach((h, i) => {
      for (let k = 0; k < PER; k++) im.setColorAt(i * PER + k, res.c.set(h.mine ? '#ffe2c8' : h.seed ? '#f4f0ff' : '#ffffff'))
    })
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [list, res])

  useFrame((state) => {
    const im = ref.current
    if (!im) return
    const t = state.clock.elapsedTime
    // 캐릭터를 아주 천천히 따라옴 (먼 하늘 느낌)
    res.anchor.x += (player.position.x - res.anchor.x) * 0.01
    res.anchor.z += (player.position.z - res.anchor.z) * 0.01
    for (let i = 0; i < list.length; i++) {
      const s = slot(i)
      // 아주 천천히 좌우로 흘러감
      const cx = res.anchor.x + s.x + Math.sin(t * 0.05 + i * 1.7) * 1.5
      const cy = s.y + Math.sin(t * 0.3 + i) * 0.15
      const cz = res.anchor.z + s.z
      for (let k = 0; k < PER; k++) {
        const [px, py, pz, r] = PUFFS[k]
        res.p.set(cx + px * s.s, cy + py * s.s, cz + pz * s.s)
        res.sc.set(r * s.s, r * s.s * 0.8, r * s.s * 0.7)
        res.m.compose(res.p, res.q, res.sc)
        im.setMatrixAt(i * PER + k, res.m)
      }
    }
    im.count = list.length * PER
    im.instanceMatrix.needsUpdate = true
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId === undefined) return
    e.stopPropagation()
    const h = list[Math.floor(e.instanceId / PER)]
    if (h) onOpen(h)
  }

  if (list.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[res.geo, res.mat, SKY_HEARTS_MAX * PER]}
      frustumCulled={false}
      userData={{ kind: 'shared-hearts' }}
      onClick={click}
      {...hoverCursor}
    />
  )
}
