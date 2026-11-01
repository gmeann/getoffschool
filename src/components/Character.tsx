import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { MoveState } from '../hooks/useClickToMove'

const SKIN = '#f6c7a1' // 살구빛 피부
const CARDIGAN = '#f2a65a'
const SHIRT = '#fff6ea'
const PANTS = '#4d4a6b'
const SLIPPER = '#8fb3d9'
const HAIR = '#3b2a2a'

type Props = {
  move: RefObject<MoveState>
  name: string
  bubble: string | null
  labelLayer: RefObject<HTMLDivElement>
}

/** 큰 머리 + 작은 몸통의 귀여운 선생님 캐릭터 (기본 도형만 사용) */
export function Character({ move, name, bubble, labelLayer }: Props) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const walkPhase = useRef(0)
  const walkAmount = useRef(0)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = move.current
    if (!root.current || !body.current || !s) return
    root.current.position.copy(s.position)
    root.current.rotation.y = s.yaw

    // 걷는 정도를 부드럽게 0↔1 로 섞어서 멈출 때 툭 끊기지 않게
    walkAmount.current = THREE.MathUtils.damp(walkAmount.current, s.moving ? 1 : 0, 10, dt)
    if (s.moving) walkPhase.current += dt * 11
    const w = walkAmount.current
    const ph = walkPhase.current

    body.current.position.y = Math.abs(Math.sin(ph)) * 0.07 * w
    body.current.rotation.z = Math.sin(ph) * 0.04 * w
    const swing = Math.sin(ph) * 0.7 * w
    if (armL.current) armL.current.rotation.x = swing
    if (armR.current) armR.current.rotation.x = -swing
    if (legL.current) legL.current.rotation.x = -swing * 0.8
    if (legR.current) legR.current.rotation.x = swing * 0.8
  })

  return (
    <group ref={root}>
      {/* 다리 + 슬리퍼 (몸통 흔들림과 따로 움직임) */}
      {[
        { ref: legL, x: -0.11 },
        { ref: legR, x: 0.11 },
      ].map(({ ref, x }) => (
        <group key={x} ref={ref} position={[x, 0.3, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <capsuleGeometry args={[0.07, 0.14, 3, 8]} />
            <meshStandardMaterial color={PANTS} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.27, 0.04]}>
            <boxGeometry args={[0.16, 0.05, 0.27]} />
            <meshStandardMaterial color={SLIPPER} roughness={0.8} />
          </mesh>
          {/* 슬리퍼 앞 끈 */}
          <mesh position={[0, -0.235, 0.09]}>
            <boxGeometry args={[0.17, 0.035, 0.09]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.8} />
          </mesh>
        </group>
      ))}

      <group ref={body}>
        {/* 몸통 = 카디건 */}
        <mesh position={[0, 0.52, 0]}>
          <capsuleGeometry args={[0.2, 0.2, 4, 10]} />
          <meshStandardMaterial color={CARDIGAN} roughness={0.9} />
        </mesh>
        {/* 카디건 사이로 보이는 셔츠 */}
        <mesh position={[0, 0.54, 0.17]} rotation-x={0.08}>
          <boxGeometry args={[0.1, 0.3, 0.06]} />
          <meshStandardMaterial color={SHIRT} roughness={0.9} />
        </mesh>
        {/* 단추 */}
        {[0.45, 0.55].map((y) => (
          <mesh key={y} position={[0.075, y, 0.195]}>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshStandardMaterial color="#b9773a" />
          </mesh>
        ))}

        {/* 사원증: 파란 줄 (V자) + 흰 카드 */}
        <mesh position={[-0.055, 0.66, 0.19]} rotation={[0.2, 0, -0.38]}>
          <boxGeometry args={[0.022, 0.2, 0.01]} />
          <meshStandardMaterial color="#3c6fd8" />
        </mesh>
        <mesh position={[0.055, 0.66, 0.19]} rotation={[0.2, 0, 0.38]}>
          <boxGeometry args={[0.022, 0.2, 0.01]} />
          <meshStandardMaterial color="#3c6fd8" />
        </mesh>
        <mesh position={[0, 0.52, 0.215]}>
          <boxGeometry args={[0.11, 0.14, 0.015]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.565, 0.224]}>
          <boxGeometry args={[0.11, 0.03, 0.004]} />
          <meshStandardMaterial color="#3c6fd8" />
        </mesh>

        {/* 팔 (어깨 기준으로 흔들림) */}
        {[
          { ref: armL, x: -0.25, rz: 0.25 },
          { ref: armR, x: 0.25, rz: -0.25 },
        ].map(({ ref, x, rz }) => (
          <group key={x} ref={ref} position={[x, 0.66, 0]}>
            <group rotation-z={rz}>
              <mesh position={[0, -0.13, 0]}>
                <capsuleGeometry args={[0.065, 0.14, 3, 8]} />
                <meshStandardMaterial color={CARDIGAN} roughness={0.9} />
              </mesh>
              <mesh position={[0, -0.26, 0]}>
                <sphereGeometry args={[0.06, 8, 6]} />
                <meshStandardMaterial color={SKIN} roughness={0.8} />
              </mesh>
            </group>
          </group>
        ))}

        {/* 머리 */}
        <group position={[0, 1.08, 0]}>
          <mesh>
            <sphereGeometry args={[0.38, 20, 16]} />
            <meshStandardMaterial color={SKIN} roughness={0.8} />
          </mesh>
          {/* 머리카락: 뒤쪽/위쪽을 덮는 반구 */}
          <mesh position={[0, 0.05, -0.04]} rotation-x={-0.5}>
            <sphereGeometry args={[0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={HAIR} roughness={0.9} side={2} />
          </mesh>
          {/* 눈 */}
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} position={[x, -0.02, 0.35]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshStandardMaterial color="#2a2233" roughness={0.5} />
            </mesh>
          ))}
          {/* 볼터치 */}
          {[-0.21, 0.21].map((x) => (
            <mesh key={x} position={[x, -0.1, 0.3]} scale={[1, 0.6, 0.4]}>
              <sphereGeometry args={[0.055, 8, 6]} />
              <meshStandardMaterial color="#f19a8e" roughness={0.9} />
            </mesh>
          ))}
          {/* 입 */}
          <mesh position={[0, -0.12, 0.36]} rotation-z={Math.PI}>
            <torusGeometry args={[0.03, 0.009, 4, 10, Math.PI]} />
            <meshStandardMaterial color="#7a3a3a" />
          </mesh>
        </group>
      </group>

      {/* 이름표 + 말풍선 (HTML 오버레이) */}
      <Html portal={labelLayer} position={[0, 1.72, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="tag-stack">
          {bubble && <div className="speech">{bubble}</div>}
          <div className="nametag">
            <span className="nametag-me">나</span>
            <span className="nametag-bar">|</span>
            {name}
          </div>
        </div>
      </Html>
    </group>
  )
}
