import { useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { Pose } from '../hooks/playerStore'

/**
 * 큰 머리 + 작은 몸통 캐릭터 모델 (기본 도형만 사용).
 * - 지오메트리는 모듈에서 한 번만 만들어 내 캐릭터와 그림자 선생님이 함께 씀
 * - ghost 재질을 넘기면 그림자 버전: 세부 장식 없이 재질 하나로만 그림
 */

const G = {
  leg: new THREE.CapsuleGeometry(0.07, 0.14, 3, 8),
  slipper: new THREE.BoxGeometry(0.16, 0.05, 0.27),
  strap: new THREE.BoxGeometry(0.17, 0.035, 0.09),
  body: new THREE.CapsuleGeometry(0.2, 0.2, 4, 10),
  shirt: new THREE.BoxGeometry(0.1, 0.3, 0.06),
  button: new THREE.SphereGeometry(0.018, 6, 4),
  lanyard: new THREE.BoxGeometry(0.022, 0.2, 0.01),
  badge: new THREE.BoxGeometry(0.11, 0.14, 0.015),
  badgeLine: new THREE.BoxGeometry(0.11, 0.03, 0.004),
  arm: new THREE.CapsuleGeometry(0.065, 0.14, 3, 8),
  hand: new THREE.SphereGeometry(0.06, 8, 6),
  head: new THREE.SphereGeometry(0.38, 20, 16),
  headLow: new THREE.SphereGeometry(0.38, 12, 10),
  hair: new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
  eye: new THREE.SphereGeometry(0.035, 8, 6),
  cheek: new THREE.SphereGeometry(0.055, 8, 6),
  mouth: new THREE.TorusGeometry(0.03, 0.009, 4, 10, Math.PI),
}

const COLORS = {
  skin: '#f6c7a1',
  cardigan: '#f2a65a',
  shirt: '#fff6ea',
  pants: '#4d4a6b',
  slipper: '#8fb3d9',
  hair: '#3b2a2a',
}

export type BodyRefs = {
  body: RefObject<THREE.Group | null>
  legs: RefObject<THREE.Group | null>
  armL: RefObject<THREE.Group | null>
  armR: RefObject<THREE.Group | null>
  legL: RefObject<THREE.Group | null>
  legR: RefObject<THREE.Group | null>
}

export function useBodyRefs(): BodyRefs {
  return {
    body: useRef<THREE.Group>(null),
    legs: useRef<THREE.Group>(null),
    armL: useRef<THREE.Group>(null),
    armR: useRef<THREE.Group>(null),
    legL: useRef<THREE.Group>(null),
    legR: useRef<THREE.Group>(null),
  }
}

/** 걷기/뛰기/앉기 동작을 부드럽게 섞기 위한 값 */
export type AnimState = { phase: number; walk: number; run: number; sit: number }
export const newAnim = (): AnimState => ({ phase: 0, walk: 0, run: 0, sit: 0 })

/** 앉았을 때 몸을 들어 올리는 높이 (벤치 좌석 높이에 맞춤) */
const SIT_LIFT = 0.24

export function animateBody(r: BodyRefs, a: AnimState, pose: Pose, dt: number) {
  const damp = THREE.MathUtils.damp
  a.walk = damp(a.walk, pose === 'walk' ? 1 : 0, 10, dt)
  a.run = damp(a.run, pose === 'run' ? 1 : 0, 10, dt)
  a.sit = damp(a.sit, pose === 'sit' ? 1 : 0, 9, dt)
  const moving = a.walk + a.run
  if (moving > 0.01) a.phase += dt * (11 * a.walk + 16 * a.run)

  const s = Math.sin(a.phase)
  const swing = s * (0.7 * a.walk + 1.15 * a.run)
  const bob = Math.abs(s) * (0.07 * a.walk + 0.13 * a.run)

  if (r.body.current) {
    r.body.current.position.y = bob + a.sit * SIT_LIFT
    r.body.current.rotation.x = 0.2 * a.run // 달릴 때 앞으로 살짝 기울임
    r.body.current.rotation.z = s * 0.04 * moving
  }
  if (r.legs.current) r.legs.current.position.y = bob * 0.5 + a.sit * SIT_LIFT
  if (r.armL.current) r.armL.current.rotation.x = swing - a.sit * 0.45
  if (r.armR.current) r.armR.current.rotation.x = -swing - a.sit * 0.45
  if (r.legL.current) r.legL.current.rotation.x = -swing * 0.8 - a.sit * 1.45
  if (r.legR.current) r.legR.current.rotation.x = swing * 0.8 - a.sit * 1.45
}

type Props = { refs: BodyRefs; ghost?: THREE.Material }

export function CharacterModel({ refs, ghost }: Props) {
  const m = (color: string, roughness = 0.9) =>
    ghost ? { material: ghost } : { children: <meshStandardMaterial color={color} roughness={roughness} /> }

  return (
    <>
      {/* 다리 + 슬리퍼 */}
      <group ref={refs.legs}>
        {[
          { ref: refs.legL, x: -0.11 },
          { ref: refs.legR, x: 0.11 },
        ].map(({ ref, x }) => (
          <group key={x} ref={ref} position={[x, 0.3, 0]}>
            <mesh geometry={G.leg} position={[0, -0.13, 0]} {...m(COLORS.pants)} />
            <mesh geometry={G.slipper} position={[0, -0.27, 0.04]} {...m(COLORS.slipper, 0.8)} />
            {!ghost && <mesh geometry={G.strap} position={[0, -0.235, 0.09]} {...m('#f4f1ea', 0.8)} />}
          </group>
        ))}
      </group>

      <group ref={refs.body}>
        {/* 몸통 = 카디건 */}
        <mesh geometry={G.body} position={[0, 0.52, 0]} {...m(COLORS.cardigan)} />

        {!ghost && (
          <>
            <mesh geometry={G.shirt} position={[0, 0.54, 0.17]} rotation-x={0.08} {...m(COLORS.shirt)} />
            {[0.45, 0.55].map((y) => (
              <mesh key={y} geometry={G.button} position={[0.075, y, 0.195]} {...m('#b9773a')} />
            ))}
            {/* 사원증: 파란 줄 + 흰 카드 */}
            <mesh geometry={G.lanyard} position={[-0.055, 0.66, 0.19]} rotation={[0.2, 0, -0.38]} {...m('#3c6fd8')} />
            <mesh geometry={G.lanyard} position={[0.055, 0.66, 0.19]} rotation={[0.2, 0, 0.38]} {...m('#3c6fd8')} />
            <mesh geometry={G.badge} position={[0, 0.52, 0.215]} {...m('#ffffff', 0.6)} />
            <mesh geometry={G.badgeLine} position={[0, 0.565, 0.224]} {...m('#3c6fd8')} />
          </>
        )}

        {/* 팔 (어깨 기준으로 흔들림) */}
        {[
          { ref: refs.armL, x: -0.25, rz: 0.25 },
          { ref: refs.armR, x: 0.25, rz: -0.25 },
        ].map(({ ref, x, rz }) => (
          <group key={x} ref={ref} position={[x, 0.66, 0]}>
            <group rotation-z={rz}>
              <mesh geometry={G.arm} position={[0, -0.13, 0]} {...m(COLORS.cardigan)} />
              <mesh geometry={G.hand} position={[0, -0.26, 0]} {...m(COLORS.skin, 0.8)} />
            </group>
          </group>
        ))}

        {/* 머리 */}
        <group position={[0, 1.08, 0]}>
          <mesh geometry={ghost ? G.headLow : G.head} {...m(COLORS.skin, 0.8)} />
          {!ghost && (
            <>
              <mesh geometry={G.hair} position={[0, 0.05, -0.04]} rotation-x={-0.5}>
                <meshStandardMaterial color={COLORS.hair} roughness={0.9} side={THREE.DoubleSide} />
              </mesh>
              {[-0.12, 0.12].map((x) => (
                <mesh key={x} geometry={G.eye} position={[x, -0.02, 0.35]} {...m('#2a2233', 0.5)} />
              ))}
              {[-0.21, 0.21].map((x) => (
                <mesh key={x} geometry={G.cheek} position={[x, -0.1, 0.3]} scale={[1, 0.6, 0.4]} {...m('#f19a8e')} />
              ))}
              <mesh geometry={G.mouth} position={[0, -0.12, 0.36]} rotation-z={Math.PI} {...m('#7a3a3a')} />
            </>
          )}
        </group>
      </group>
    </>
  )
}
