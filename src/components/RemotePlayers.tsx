import { useMemo, useRef, useSyncExternalStore, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getPresence, remotePlayers, subscribePresence } from '../services/presenceService'
import { CharacterModel, animateBody, newAnim, useBodyRefs, type Look } from './CharacterModel'

/** 함께 있는 선생님 옷차림: uid 로 정해서 누구 화면에서나 같은 색 (서버로 보내지 않음) */
const TOPS = ['#7fb8d9', '#e58f8f', '#8fcf9f', '#c49be0', '#9ad0e8', '#6fc2b8', '#e39ac2', '#a3b4e8']
const HAIRS = ['#3b2a2a', '#5a3d2b', '#2a2a35', '#7a5a45']
const SKINS = ['#f6c7a1', '#f1bf96', '#f8d0b0']

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function lookFor(uid: string): Look {
  const h = hash(uid)
  const top = TOPS[h % TOPS.length]
  return {
    top,
    sleeves: top,
    inner: '#fffaf2',
    pants: '#4d4a6b',
    shoes: '#e9e4da',
    hair: HAIRS[(h >> 3) % HAIRS.length],
    skin: SKINS[(h >> 6) % SKINS.length],
    badge: true,
  }
}

/** 각도를 가장 짧은 쪽으로 돌기 */
function dampAngle(a: number, b: number, lambda: number, dt: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * (1 - Math.exp(-lambda * dt))
}

function RemotePlayer({ uid, labelLayer }: { uid: string; labelLayer: RefObject<HTMLDivElement> }) {
  const root = useRef<THREE.Group>(null)
  const tag = useRef<THREE.Group>(null)
  const nameEl = useRef<HTMLSpanElement>(null)
  const refs = useBodyRefs()
  const anim = useRef(newAnim())
  const look = useMemo(() => lookFor(uid), [uid])
  const placed = useRef(false)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const g = root.current
    const r = remotePlayers.get(uid)
    if (!g || !r) return
    if (!placed.current) {
      // 처음 나타날 때는 그 자리에 바로 놓음
      g.position.set(r.x, 0, r.z)
      g.rotation.y = r.yaw
      placed.current = true
    }
    // 위치는 0.5초마다 오므로 그 사이를 부드럽게 따라감. 너무 멀면(순간 이동) 바로 옮김
    const dx = r.x - g.position.x
    const dz = r.z - g.position.z
    if (dx * dx + dz * dz > 64) g.position.set(r.x, 0, r.z)
    else {
      const k = 1 - Math.exp(-8 * dt)
      g.position.x += dx * k
      g.position.z += dz * k
    }
    g.rotation.y = dampAngle(g.rotation.y, r.yaw, 10, dt)
    animateBody(refs, anim.current, r.pose, dt, 1, r.lift)
    if (tag.current) tag.current.position.y = 1.72 + anim.current.sit * r.lift
    if (nameEl.current && nameEl.current.textContent !== r.name) nameEl.current.textContent = r.name
  })

  return (
    <group ref={root}>
      <CharacterModel refs={refs} look={look} />
      <group ref={tag} position-y={1.72}>
        <Html portal={labelLayer} center zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
          <div className="tag-stack">
            <div className="nametag real">
              <span className="real-dot" aria-hidden />
              <span ref={nameEl}>{remotePlayers.get(uid)?.name ?? '선생님'}</span>
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}

/** 같은 공간에 접속해 있는 다른 선생님들 (실제 사람) */
export function RemotePlayers({ labelLayer }: { labelLayer: RefObject<HTMLDivElement> }) {
  const { others } = useSyncExternalStore(subscribePresence, getPresence)
  return (
    <>
      {others.map((uid) => (
        <RemotePlayer key={uid} uid={uid} labelLayer={labelLayer} />
      ))}
    </>
  )
}
