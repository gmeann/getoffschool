import { useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { Pose } from '../hooks/playerStore'

/**
 * 큰 머리 + 작은 몸통 캐릭터 모델 (기본 도형만 사용).
 * - 지오메트리와 재질을 모듈에서 한 번만 만들어 모든 캐릭터가 함께 씀 (장면을 바꿔도 재사용)
 * - look(옷차림)으로 내 캐릭터 / 산책하는 선생님 / NPC 를 구분
 */

const G = {
  leg: new THREE.CapsuleGeometry(0.07, 0.14, 3, 8),
  slipper: new THREE.BoxGeometry(0.16, 0.05, 0.27),
  strap: new THREE.BoxGeometry(0.17, 0.035, 0.09),
  body: new THREE.CapsuleGeometry(0.2, 0.2, 4, 10),
  inner: new THREE.BoxGeometry(0.1, 0.3, 0.06),
  tie: new THREE.BoxGeometry(0.04, 0.2, 0.02),
  button: new THREE.SphereGeometry(0.018, 6, 4),
  lanyard: new THREE.BoxGeometry(0.022, 0.2, 0.01),
  badge: new THREE.BoxGeometry(0.11, 0.14, 0.015),
  badgeLine: new THREE.BoxGeometry(0.11, 0.03, 0.004),
  arm: new THREE.CapsuleGeometry(0.065, 0.14, 3, 8),
  hand: new THREE.SphereGeometry(0.06, 8, 6),
  head: new THREE.SphereGeometry(0.38, 20, 16),
  hair: new THREE.SphereGeometry(0.4, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
  eye: new THREE.SphereGeometry(0.035, 8, 6),
  cheek: new THREE.SphereGeometry(0.055, 8, 6),
  mouth: new THREE.TorusGeometry(0.03, 0.009, 4, 10, Math.PI),
  lens: new THREE.TorusGeometry(0.07, 0.012, 6, 16),
  bridge: new THREE.BoxGeometry(0.09, 0.012, 0.012),
}

/** 같은 색 재질은 하나만 만들어 공유 */
const matCache = new Map<string, THREE.MeshStandardMaterial>()
function mat(color: string, roughness = 0.9, double = false) {
  const key = `${color}|${roughness}|${double}`
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, side: double ? THREE.DoubleSide : THREE.FrontSide })
    matCache.set(key, m)
  }
  return m
}

export type Look = {
  /** 몸통(카디건·조끼·재킷) */
  top: string
  /** 소매(팔) */
  sleeves: string
  /** 앞섶 사이로 보이는 셔츠 */
  inner?: string
  tie?: string
  pants: string
  shoes: string
  hair: string
  skin: string
  glasses?: boolean
  badge?: boolean
  buttons?: boolean
  /** 볼터치·입 같은 얼굴 세부 (멀리 있는 캐릭터는 생략해 가볍게) */
  face?: boolean
}

export const PLAYER_LOOK: Look = {
  top: '#f2a65a',
  sleeves: '#f2a65a',
  inner: '#fff6ea',
  pants: '#4d4a6b',
  shoes: '#8fb3d9',
  hair: '#3b2a2a',
  skin: '#f6c7a1',
  badge: true,
  buttons: true,
  face: true,
}

export type BodyRefs = {
  body: RefObject<THREE.Group | null>
  legs: RefObject<THREE.Group | null>
  head: RefObject<THREE.Group | null>
  armL: RefObject<THREE.Group | null>
  armR: RefObject<THREE.Group | null>
  legL: RefObject<THREE.Group | null>
  legR: RefObject<THREE.Group | null>
}

export function useBodyRefs(): BodyRefs {
  return {
    body: useRef<THREE.Group>(null),
    legs: useRef<THREE.Group>(null),
    head: useRef<THREE.Group>(null),
    armL: useRef<THREE.Group>(null),
    armR: useRef<THREE.Group>(null),
    legL: useRef<THREE.Group>(null),
    legR: useRef<THREE.Group>(null),
  }
}

/** 걷기/뛰기/앉기/인사 동작을 부드럽게 섞기 위한 값 */
export type AnimState = { phase: number; walk: number; run: number; sit: number; bow: number }
export const newAnim = (): AnimState => ({ phase: 0, walk: 0, run: 0, sit: 0, bow: 0 })

/** 앉았을 때 몸을 들어 올리는 높이 (벤치·의자 좌석 높이에 맞춤) */
export const SIT_LIFT = 0.24

/**
 * @param stride 걸음 빠르기 배율 (천천히 걷는 캐릭터는 1보다 작게)
 */
export function animateBody(r: BodyRefs, a: AnimState, pose: Pose, dt: number, stride = 1, sitLift = SIT_LIFT) {
  const damp = THREE.MathUtils.damp
  a.walk = damp(a.walk, pose === 'walk' ? 1 : 0, 10, dt)
  a.run = damp(a.run, pose === 'run' ? 1 : 0, 10, dt)
  a.sit = damp(a.sit, pose === 'sit' ? 1 : 0, 9, dt)
  a.bow = damp(a.bow, pose === 'bow' ? 1 : 0, 7, dt)
  const moving = a.walk + a.run
  if (moving > 0.01) a.phase += dt * (9 * a.walk + 16 * a.run) * stride

  const s = Math.sin(a.phase)
  const swing = s * (0.6 * a.walk + 1.15 * a.run)
  const bob = Math.abs(s) * (0.06 * a.walk + 0.13 * a.run)

  if (r.body.current) {
    r.body.current.position.y = bob + a.sit * sitLift
    r.body.current.rotation.x = 0.2 * a.run + 0.5 * a.bow // 달릴 때 앞으로 기울임, 인사할 때 숙임
    r.body.current.rotation.z = s * 0.04 * moving
  }
  if (r.legs.current) r.legs.current.position.y = bob * 0.5 + a.sit * sitLift
  // 바닥에 앉으면 두 팔을 뒤로 짚음, 의자·벤치는 무릎 위에
  const armSit = sitLift < 0 ? 0.75 : -0.45
  // 인사: 두 손을 가슴 앞에 모음
  if (r.armL.current) {
    r.armL.current.rotation.x = swing + a.sit * armSit - a.bow * 1.1
    r.armL.current.rotation.z = a.bow * 0.55
  }
  if (r.armR.current) {
    r.armR.current.rotation.x = -swing + a.sit * armSit - a.bow * 1.1
    r.armR.current.rotation.z = -a.bow * 0.55
  }
  if (r.legL.current) r.legL.current.rotation.x = -swing * 0.8 - a.sit * 1.45
  if (r.legR.current) r.legR.current.rotation.x = swing * 0.8 - a.sit * 1.45
}

export function CharacterModel({ refs, look }: { refs: BodyRefs; look: Look }) {
  return (
    <>
      {/* 다리 + 슬리퍼 */}
      <group ref={refs.legs}>
        {[
          { ref: refs.legL, x: -0.11 },
          { ref: refs.legR, x: 0.11 },
        ].map(({ ref, x }) => (
          <group key={x} ref={ref} position={[x, 0.3, 0]}>
            <mesh geometry={G.leg} material={mat(look.pants)} position={[0, -0.13, 0]} />
            <mesh geometry={G.slipper} material={mat(look.shoes, 0.8)} position={[0, -0.27, 0.04]} />
            {look.face && <mesh geometry={G.strap} material={mat('#f4f1ea', 0.8)} position={[0, -0.235, 0.09]} />}
          </group>
        ))}
      </group>

      <group ref={refs.body}>
        <mesh geometry={G.body} material={mat(look.top)} position={[0, 0.52, 0]} />
        {look.inner && <mesh geometry={G.inner} material={mat(look.inner)} position={[0, 0.54, 0.17]} rotation-x={0.08} />}
        {look.tie && <mesh geometry={G.tie} material={mat(look.tie, 0.6)} position={[0, 0.55, 0.205]} rotation-x={0.08} />}
        {look.buttons &&
          [0.45, 0.55].map((y) => <mesh key={y} geometry={G.button} material={mat('#b9773a')} position={[0.075, y, 0.195]} />)}
        {look.badge && (
          <>
            {/* 사원증: 파란 줄 + 흰 카드 */}
            <mesh geometry={G.lanyard} material={mat('#3c6fd8')} position={[-0.055, 0.66, 0.19]} rotation={[0.2, 0, -0.38]} />
            <mesh geometry={G.lanyard} material={mat('#3c6fd8')} position={[0.055, 0.66, 0.19]} rotation={[0.2, 0, 0.38]} />
            <mesh geometry={G.badge} material={mat('#ffffff', 0.6)} position={[0, 0.52, 0.215]} />
            <mesh geometry={G.badgeLine} material={mat('#3c6fd8')} position={[0, 0.565, 0.224]} />
          </>
        )}

        {/* 팔 (어깨 기준으로 흔들림) */}
        {[
          { ref: refs.armL, x: -0.25, rz: 0.25 },
          { ref: refs.armR, x: 0.25, rz: -0.25 },
        ].map(({ ref, x, rz }) => (
          <group key={x} ref={ref} position={[x, 0.66, 0]}>
            <group rotation-z={rz}>
              <mesh geometry={G.arm} material={mat(look.sleeves)} position={[0, -0.13, 0]} />
              <mesh geometry={G.hand} material={mat(look.skin, 0.8)} position={[0, -0.26, 0]} />
            </group>
          </group>
        ))}

        {/* 머리 (고개 돌리기용 ref) */}
        <group ref={refs.head} position={[0, 1.08, 0]}>
          <mesh geometry={G.head} material={mat(look.skin, 0.8)} />
          <mesh geometry={G.hair} material={mat(look.hair, 0.9, true)} position={[0, 0.05, -0.04]} rotation-x={-0.5} />
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} geometry={G.eye} material={mat('#2a2233', 0.5)} position={[x, -0.02, 0.35]} />
          ))}
          {look.glasses && (
            <>
              {[-0.12, 0.12].map((x) => (
                <mesh key={x} geometry={G.lens} material={mat('#2a2a3a', 0.4)} position={[x, -0.02, 0.37]} />
              ))}
              <mesh geometry={G.bridge} material={mat('#2a2a3a', 0.4)} position={[0, -0.01, 0.38]} />
            </>
          )}
          {look.face && (
            <>
              {[-0.21, 0.21].map((x) => (
                <mesh key={x} geometry={G.cheek} material={mat('#f19a8e')} position={[x, -0.1, 0.3]} scale={[1, 0.6, 0.4]} />
              ))}
              <mesh geometry={G.mouth} material={mat('#7a3a3a')} position={[0, -0.12, 0.36]} rotation-z={Math.PI} />
            </>
          )}
        </group>
      </group>
    </>
  )
}
