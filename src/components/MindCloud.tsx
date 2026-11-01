import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 마음 띄우기 연출: 글이 말풍선 구름이 되어 머리 위에 1.5초 보였다가 노을 하늘로 떠올라 사라짐 (약 5초).
 * 글은 props 로만 받아 React 텍스트로 그리고, 끝나면 onDone → 부모가 상태를 비움 (어디에도 저장 안 함).
 */

const TOTAL = 5.0
const POP = 0.4
const HOLD_END = 1.9 // 0.4~1.9초: 읽을 수 있게 멈춤
const SPARKS = 30
/** 구름 크기 (화면을 너무 가리지 않게) */
const CLOUD_SIZE = 0.62

const PUFFS: [number, number, number, number][] = [
  [0, 0, 0, 0.55],
  [-0.55, -0.08, 0.05, 0.42],
  [0.55, -0.06, 0.02, 0.45],
  [-0.25, 0.28, -0.05, 0.4],
  [0.3, 0.26, 0.04, 0.38],
  [-0.95, -0.18, 0, 0.28],
  [0.95, -0.16, 0, 0.3],
]

type Props = {
  text: string
  /** 구름이 나타날 위치 (캐릭터 머리 위) */
  origin: THREE.Vector3
  onDone: () => void
  labelLayer: RefObject<HTMLDivElement>
}

export function MindCloud({ text, origin, onDone, labelLayer }: Props) {
  const group = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const sparksRef = useRef<THREE.InstancedMesh>(null)
  const t = useRef(0)
  const finished = useRef(false)

  const res = useMemo(
    () => ({
      puffGeo: new THREE.SphereGeometry(1, 14, 10),
      puffMat: new THREE.MeshStandardMaterial({ color: '#fff6f2', emissive: '#ffd9cf', emissiveIntensity: 0.35, roughness: 1, transparent: true }),
      sparkGeo: new THREE.OctahedronGeometry(1, 0),
      sparkMat: new THREE.MeshBasicMaterial({ color: '#ffe3a3', toneMapped: false }),
    }),
    [],
  )
  useEffect(
    () => () => {
      Object.values(res).forEach((r) => r.dispose())
    },
    [res],
  )

  // 빛 입자 (최대 30개, 돌려 씀)
  const P = useMemo(
    () => ({
      pos: new Float32Array(SPARKS * 3),
      vel: new Float32Array(SPARKS * 3),
      life: new Float32Array(SPARKS),
      max: new Float32Array(SPARKS),
      next: 0,
      acc: 0,
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      v: new THREE.Vector3(),
      s: new THREE.Vector3(),
    }),
    [],
  )
  useEffect(() => {
    const im = sparksRef.current
    if (!im) return
    P.m.makeScale(0, 0, 0)
    for (let i = 0; i < SPARKS; i++) im.setMatrixAt(i, P.m)
    im.instanceMatrix.needsUpdate = true
  }, [P])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    t.current += dt
    const time = t.current
    const g = group.current
    if (!g) return

    // 위치·크기·투명도
    const pop = Math.min(1, time / POP)
    const popScale = 1 - Math.pow(1 - pop, 3) + Math.sin(pop * Math.PI) * 0.12
    const rise = THREE.MathUtils.smoothstep(time, HOLD_END, TOTAL)
    const y = origin.y + rise * 7.5
    const fade = 1 - THREE.MathUtils.smoothstep(time, HOLD_END + 1.2, TOTAL)
    const shrink = 1 - rise * 0.7
    g.position.set(origin.x + Math.sin(time * 0.8) * 0.15 * rise, y + Math.sin(time * 2.2) * 0.04, origin.z - rise * 1.5)
    g.scale.setScalar(popScale * shrink * CLOUD_SIZE)
    res.puffMat.opacity = Math.max(0, fade) * 0.96
    if (label.current) {
      label.current.style.opacity = String(Math.max(0, Math.min(pop, 1 - THREE.MathUtils.smoothstep(time, HOLD_END + 0.3, HOLD_END + 2.2))))
    }

    // 빛 입자 뿌리기 (0.3~4.5초)
    const im = sparksRef.current
    if (im) {
      if (time > 0.3 && time < 4.5) {
        P.acc += dt * 9
        while (P.acc >= 1) {
          P.acc -= 1
          const i = P.next
          P.next = (P.next + 1) % SPARKS
          const a = Math.random() * Math.PI * 2
          const r = 0.6 + Math.random() * 0.6
          P.pos.set([g.position.x + Math.cos(a) * r * g.scale.x * 2.2, g.position.y + (Math.random() - 0.3) * 0.6 * g.scale.x, g.position.z + Math.sin(a) * r * 0.5], i * 3)
          P.vel.set([(Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.3], i * 3)
          P.life[i] = P.max[i] = 0.9 + Math.random() * 0.8
        }
      }
      for (let i = 0; i < SPARKS; i++) {
        if (P.life[i] <= 0) continue
        P.life[i] -= dt
        const o = i * 3
        P.pos[o] += P.vel[o] * dt
        P.pos[o + 1] += P.vel[o + 1] * dt
        P.pos[o + 2] += P.vel[o + 2] * dt
        const k = Math.max(0, P.life[i] / P.max[i])
        const size = 0.06 * Math.sin(k * Math.PI)
        P.q.setFromAxisAngle(P.v.set(0, 1, 0), time * 3 + i)
        P.m.compose(P.v.set(P.pos[o], P.pos[o + 1], P.pos[o + 2]), P.q, P.s.set(size, size, size))
        im.setMatrixAt(i, P.m)
      }
      im.instanceMatrix.needsUpdate = true
    }

    if (time >= TOTAL && !finished.current) {
      finished.current = true
      onDone()
    }
  })

  return (
    <>
      <group ref={group} position={origin}>
        {PUFFS.map(([x, y, z, r], i) => (
          <mesh key={i} geometry={res.puffGeo} material={res.puffMat} position={[x, y, z]} scale={[r, r * 0.85, r * 0.7]} />
        ))}
        <Html portal={labelLayer} position={[0, 0, 0.5]} center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
          {/* 사용자가 쓴 글: React 텍스트로만 (HTML 해석 없음) */}
          <div ref={label} className="mind-cloud-text">
            {text}
          </div>
        </Html>
      </group>
      <instancedMesh ref={sparksRef} args={[res.sparkGeo, res.sparkMat, SPARKS]} frustumCulled={false} />
    </>
  )
}
