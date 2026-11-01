import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BLACKBOARD, CLASS_ROOM, OPEN_WINDOW_Z, SHREDDER } from '../data/classroom'
import type { FlingMethod, TaskLabel } from '../data/tasks'

/**
 * 업무 날리기 연출 4종.
 * - 동시에 최대 SLOTS 장까지 날아감 (연타하면 빈 칸 → 없으면 가장 오래된 것 재사용)
 * - 파티클은 InstancedMesh 하나(최대 60개)를 돌려 씀
 * - 한 장의 연출은 DURATION(1.25초) 안에 끝남
 */

export type TaskEffectsHandle = { play: (method: FlingMethod, label: TaskLabel, from: THREE.Vector3) => void }

const SLOTS = 6
const CHALK_W = 2.0
const PLANE_SCALE = 1.7
const DURATION = 1.25
const MAX_PARTICLES = 60
const FONT = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"

const WINDOW_POINT = new THREE.Vector3(CLASS_ROOM.minX - 0.1, 1.9, OPEN_WINDOW_Z)
const OUTSIDE_POINT = new THREE.Vector3(CLASS_ROOM.minX - 3.2, 2.7, OPEN_WINDOW_Z - 0.6)
const SHRED_SLOT = new THREE.Vector3(SHREDDER.x, SHREDDER.h, SHREDDER.z)

// ---------- 공용 지오메트리·재질 ----------
function makePlaneGeometry() {
  // 종이비행기: 뾰족한 앞코 + 양 날개 + 아래 용골 (삼각형 6개)
  const nose = [0, 0, 0.26]
  const lt = [-0.2, 0.03, -0.2]
  const rt = [0.2, 0.03, -0.2]
  const cb = [0, 0, -0.2]
  const kb = [0, -0.07, -0.2]
  const v = [...nose, ...lt, ...cb, ...nose, ...cb, ...rt, ...nose, ...kb, ...cb]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  g.computeVertexNormals()
  return g
}

const ease = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
}
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))

/** 2차 베지어 곡선 위의 점 */
function bezier(out: THREE.Vector3, a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number) {
  const u = 1 - t
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  )
}

type Slot = {
  active: boolean
  method: FlingMethod
  t: number
  from: THREE.Vector3
  ctrl: THREE.Vector3
  to: THREE.Vector3
  boardX: number
  emitted: number
  startedAt: number
}

type ParticleKind = 'strip' | 'dust' | 'confetti'

export const TaskEffects = forwardRef<TaskEffectsHandle>(function TaskEffects(_, ref) {
  // ---------- 리소스 (장면을 떠날 때 정리) ----------
  const res = useMemo(() => {
    // 화면에서 잘 보이도록 실제보다 조금 크게 (만화 같은 비율)
    const paperGeo = new THREE.BoxGeometry(0.4, 0.005, 0.56)
    const stripeGeo = new THREE.BoxGeometry(0.4, 0.007, 0.08)
    const lineGeo = new THREE.BoxGeometry(0.28, 0.007, 0.016)
    const planeGeo = makePlaneGeometry()
    const balloonGeo = new THREE.SphereGeometry(1, 16, 12)
    const eraserGeo = new THREE.BoxGeometry(0.42, 0.15, 0.1)
    const eraserTopGeo = new THREE.BoxGeometry(0.42, 0.06, 0.105)
    const chalkGeo = new THREE.PlaneGeometry(CHALK_W, CHALK_W * 0.31)
    const particleGeo = new THREE.BoxGeometry(1, 1, 1)
    const paperMat = new THREE.MeshStandardMaterial({ color: '#fbf8f0', roughness: 0.9 })
    const lineMat = new THREE.MeshStandardMaterial({ color: '#b9b4ab' })
    const planeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.8 })
    const eraserMat = new THREE.MeshStandardMaterial({ color: '#4a5a8a' })
    const eraserTopMat = new THREE.MeshStandardMaterial({ color: '#f2f2f2' })
    const particleMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
    const stripeMats = Array.from({ length: SLOTS }, () => new THREE.MeshStandardMaterial({ color: '#e05a5a' }))
    const balloonMats = Array.from({ length: SLOTS }, () => new THREE.MeshStandardMaterial({ color: '#ff8fb1', roughness: 0.35 }))
    const chalkMats = Array.from({ length: SLOTS }, () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }))
    return {
      paperGeo, stripeGeo, lineGeo, planeGeo, balloonGeo, eraserGeo, eraserTopGeo, chalkGeo, particleGeo,
      paperMat, lineMat, planeMat, eraserMat, eraserTopMat, particleMat, stripeMats, balloonMats, chalkMats,
    }
  }, [])

  /** 칠판에 쓸 분필 글씨 텍스처 (라벨별로 한 번만 그림) */
  const chalkCache = useRef(new Map<string, THREE.CanvasTexture>())
  const chalkClones = useRef<(THREE.Texture | null)[]>(Array(SLOTS).fill(null))
  const chalkTexture = (text: string) => {
    let tex = chalkCache.current.get(text)
    if (!tex) {
      const c = document.createElement('canvas')
      c.width = 512
      c.height = 160
      const ctx = c.getContext('2d')!
      ctx.font = `700 84px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fillText(text, 256, 84)
      tex = new THREE.CanvasTexture(c)
      tex.colorSpace = THREE.SRGBColorSpace
      chalkCache.current.set(text, tex)
    }
    return tex
  }

  useEffect(
    () => () => {
      Object.values(res).forEach((v) => {
        if (Array.isArray(v)) v.forEach((m) => m.dispose())
        else v.dispose()
      })
      chalkCache.current.forEach((t) => t.dispose())
      chalkClones.current.forEach((t) => t?.dispose())
    },
    [res],
  )

  // ---------- 슬롯별 오브젝트 ref ----------
  const paperRefs = useRef<(THREE.Group | null)[]>([])
  const planeRefs = useRef<(THREE.Mesh | null)[]>([])
  const balloonRefs = useRef<(THREE.Mesh | null)[]>([])
  const eraserRefs = useRef<(THREE.Group | null)[]>([])
  const chalkRefs = useRef<(THREE.Mesh | null)[]>([])
  const slots = useRef<Slot[]>(
    Array.from({ length: SLOTS }, () => ({
      active: false,
      method: 'airplane',
      t: 0,
      from: new THREE.Vector3(),
      ctrl: new THREE.Vector3(),
      to: new THREE.Vector3(),
      boardX: 0,
      emitted: 0,
      startedAt: 0,
    })),
  )
  const clock = useRef(0)

  // ---------- 파티클 ----------
  const particlesRef = useRef<THREE.InstancedMesh>(null)
  const P = useMemo(
    () => ({
      pos: new Float32Array(MAX_PARTICLES * 3),
      vel: new Float32Array(MAX_PARTICLES * 3),
      size: new Float32Array(MAX_PARTICLES * 3),
      rot: new Float32Array(MAX_PARTICLES * 3),
      spin: new Float32Array(MAX_PARTICLES * 3),
      life: new Float32Array(MAX_PARTICLES),
      maxLife: new Float32Array(MAX_PARTICLES),
      gravity: new Float32Array(MAX_PARTICLES),
      drag: new Float32Array(MAX_PARTICLES),
      next: 0,
    }),
    [],
  )
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      s: new THREE.Vector3(),
      p: new THREE.Vector3(),
      v: new THREE.Vector3(),
      c: new THREE.Color(),
    }),
    [],
  )

  useEffect(() => {
    const im = particlesRef.current
    if (!im) return
    tmp.m.makeScale(0, 0, 0)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      im.setMatrixAt(i, tmp.m)
      im.setColorAt(i, tmp.c.set('#ffffff'))
    }
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [tmp])

  const CONFETTI = ['#ff6b6b', '#ffd23f', '#4ab0d9', '#7ac94a', '#b07ad9', '#ff8fb1', '#f2a65a']
  const emit = (kind: ParticleKind, origin: THREE.Vector3, color?: string) => {
    const im = particlesRef.current
    if (!im) return
    // 빈 칸이 없으면 가장 오래된 칸부터 재사용 (돌아가며 씀)
    const i = P.next
    P.next = (P.next + 1) % MAX_PARTICLES
    const r = (a: number, b: number) => a + Math.random() * (b - a)
    let vx = 0, vy = 0, vz = 0, sx = 0.03, sy = 0.03, sz = 0.03, life = 1, g = 0, drag = 0
    let col = '#ffffff'
    if (kind === 'strip') {
      vx = r(-0.35, 0.35); vy = r(-0.1, 0.5); vz = r(0.35, 0.9)
      sx = 0.03; sy = 0.22; sz = 0.005; life = r(0.9, 1.2); g = 6; drag = 0.6
      col = Math.random() < 0.75 ? '#f7f3ea' : (color ?? '#dddddd')
    } else if (kind === 'dust') {
      vx = r(-0.3, 0.3); vy = r(0.05, 0.45); vz = r(0.1, 0.5)
      sx = sy = sz = r(0.04, 0.07); life = r(0.6, 0.9); g = -0.2; drag = 2.2
    } else {
      const a = Math.random() * Math.PI * 2
      const up = r(-0.2, 1)
      const sp = r(1.4, 2.6)
      vx = Math.cos(a) * sp; vy = up * sp; vz = Math.sin(a) * sp
      sx = 0.11; sy = 0.11; sz = 0.006; life = r(0.9, 1.2); g = 3.2; drag = 2.0
      col = CONFETTI[Math.floor(Math.random() * CONFETTI.length)]
    }
    P.pos.set([origin.x, origin.y, origin.z], i * 3)
    P.vel.set([vx, vy, vz], i * 3)
    P.size.set([sx, sy, sz], i * 3)
    P.rot.set([r(0, 6), r(0, 6), r(0, 6)], i * 3)
    P.spin.set(kind === 'dust' ? [0, 0, 0] : [r(-8, 8), r(-8, 8), r(-8, 8)], i * 3)
    P.life[i] = life
    P.maxLife[i] = life
    P.gravity[i] = g
    P.drag[i] = drag
    im.setColorAt(i, tmp.c.set(col))
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }

  // ---------- 재생 ----------
  useImperativeHandle(ref, () => ({
    play(method, label, from) {
      const list = slots.current
      let idx = list.findIndex((s) => !s.active)
      if (idx < 0) idx = list.reduce((best, s, i) => (s.startedAt < list[best].startedAt ? i : best), 0)
      const s = list[idx]
      s.active = true
      s.method = method
      s.t = 0
      s.emitted = 0
      s.startedAt = clock.current
      s.from.copy(from)
      s.boardX = (Math.random() - 0.5) * (BLACKBOARD.w - 2)
      res.stripeMats[idx].color.set(label.color)
      res.balloonMats[idx].color.setHSL(Math.random(), 0.75, 0.68)
      if (method === 'eraser') {
        chalkClones.current[idx]?.dispose()
        const tex = chalkTexture(label.name).clone()
        tex.needsUpdate = true
        chalkClones.current[idx] = tex
        res.chalkMats[idx].map = tex
        res.chalkMats[idx].needsUpdate = true
      }
      if (method === 'airplane') {
        s.to.copy(WINDOW_POINT)
        s.ctrl.copy(from).lerp(WINDOW_POINT, 0.5).add(tmp.v.set(0, 1.0, 1.2))
      } else if (method === 'shredder') {
        s.to.copy(SHRED_SLOT).add(tmp.v.set(0, 0.32, 0))
        s.ctrl.copy(from).lerp(s.to, 0.5).add(tmp.v.set(0, 0.5, 0))
      } else if (method === 'eraser') {
        s.to.set(BLACKBOARD.x + s.boardX, BLACKBOARD.y + 0.1, CLASS_ROOM.minZ + 0.08)
        s.ctrl.copy(from).lerp(s.to, 0.5).add(tmp.v.set(0, 0.8, 0.6))
      } else {
        s.to.copy(from).add(tmp.v.set(0, 0.55, 0.2))
      }
    },
  }))

  useFrame((_, rawDt) => {
    // 개발 중 스크린샷 확인용: window.__fxSpeed 로 연출 속도 조절 (배포 빌드에서는 항상 1)
    const speed = import.meta.env.DEV ? ((window as unknown as { __fxSpeed?: number }).__fxSpeed ?? 1) : 1
    const dt = Math.min(rawDt, 0.1) * speed
    clock.current += dt
    const v = tmp.p

    slots.current.forEach((s, i) => {
      const paper = paperRefs.current[i]
      const plane = planeRefs.current[i]
      const balloon = balloonRefs.current[i]
      const eraser = eraserRefs.current[i]
      const chalk = chalkRefs.current[i]
      if (!paper || !plane || !balloon || !eraser || !chalk) return
      if (!s.active) {
        paper.visible = plane.visible = balloon.visible = eraser.visible = chalk.visible = false
        return
      }
      s.t += dt
      const t = s.t
      paper.visible = plane.visible = balloon.visible = eraser.visible = chalk.visible = false
      paper.rotation.set(0, 0, 0)
      paper.scale.setScalar(1)

      if (s.method === 'airplane') {
        // 0~0.3 들어 올리며 접기 → 0.3~1.0 창문까지 곡선 비행 → 1.0~ 창밖으로 작아지며 사라짐
        const fold = ease.out(seg(t, 0, 0.3))
        const lift = v.copy(s.from).add(tmp.v.set(0, 0.45 * fold, 0))
        if (t < 0.3) {
          paper.visible = true
          paper.position.copy(lift)
          paper.scale.set(1 - fold * 0.9, 1, 1 - fold * 0.6)
          plane.visible = true
          plane.position.copy(lift)
          plane.scale.setScalar(fold * PLANE_SCALE)
          plane.lookAt(s.to)
        } else if (t < 1.0) {
          const u = ease.inOut(seg(t, 0.3, 1.0))
          const start = tmp.s.copy(s.from).add(tmp.v.set(0, 0.45, 0))
          bezier(v, start, s.ctrl, s.to, u)
          plane.visible = true
          plane.position.copy(v)
          plane.scale.setScalar(PLANE_SCALE)
          bezier(tmp.v, start, s.ctrl, s.to, Math.min(1, u + 0.04))
          plane.lookAt(tmp.v)
          plane.rotateZ(Math.sin(t * 9) * 0.25)
        } else {
          const u = seg(t, 1.0, DURATION)
          plane.visible = true
          plane.position.copy(s.to).lerp(OUTSIDE_POINT, u)
          plane.scale.setScalar((1 - u) * PLANE_SCALE)
          plane.lookAt(OUTSIDE_POINT)
        }
      } else if (s.method === 'shredder') {
        // 0~0.45 파쇄기 위로 날아가 세워짐 → 0.45~0.85 투입구로 빨려 들어감 + 띠 조각 쏟아짐
        paper.visible = t < 0.88
        if (t < 0.45) {
          const u = ease.inOut(seg(t, 0, 0.45))
          bezier(v, s.from, s.ctrl, s.to, u)
          paper.position.copy(v)
          paper.rotation.x = (Math.PI / 2) * u
        } else {
          const u = seg(t, 0.45, 0.85)
          paper.position.copy(s.to).add(tmp.v.set(Math.sin(t * 60) * 0.006, -0.5 * u, 0))
          paper.rotation.x = Math.PI / 2
          // 띠 조각: 0.5~0.85 사이에 12개
          const want = Math.floor(seg(t, 0.5, 0.85) * 16)
          while (s.emitted < want) {
            emit('strip', tmp.v.set(SHREDDER.x + (Math.random() - 0.5) * 0.35, 0.32, SHREDDER.z + 0.24), res.stripeMats[i].color.getStyle())
            s.emitted++
          }
        }
      } else if (s.method === 'eraser') {
        // 0~0.4 칠판으로 날아감 → 0.4~0.5 분필 글씨로 바뀜 → 0.5~1.05 지우개가 슥슥 → 하얀 가루
        if (t < 0.5) {
          const u = ease.inOut(seg(t, 0, 0.4))
          bezier(v, s.from, s.ctrl, s.to, u)
          paper.visible = true
          paper.position.copy(v)
          paper.rotation.x = (Math.PI / 2) * u
          paper.scale.setScalar(1 - 0.9 * seg(t, 0.4, 0.5))
        }
        const cx = s.to.x
        const W = CHALK_W
        if (t >= 0.4) {
          const appear = seg(t, 0.4, 0.5)
          const wipe = ease.inOut(seg(t, 0.5, 1.05))
          chalk.visible = wipe < 0.999
          // 왼쪽부터 지워짐: 보이는 부분만 남기도록 텍스처를 잘라 씀
          const map = res.chalkMats[i].map
          if (map) {
            map.repeat.x = 1 - wipe
            map.offset.x = wipe
          }
          chalk.scale.set(1 - wipe, appear, 1)
          chalk.position.set(cx + (wipe * W) / 2, s.to.y, CLASS_ROOM.minZ + 0.07)
          if (t >= 0.5) {
            eraser.visible = t < DURATION
            const ex = cx - W / 2 + wipe * W
            const ey = s.to.y + Math.sin(t * 42) * 0.07 // 슥슥
            eraser.position.set(ex, ey, CLASS_ROOM.minZ + 0.12)
            eraser.scale.setScalar(1 - seg(t, 1.05, DURATION))
            const want = Math.floor(seg(t, 0.52, 1.05) * 14)
            while (s.emitted < want) {
              emit('dust', tmp.v.set(ex, ey - 0.05, CLASS_ROOM.minZ + 0.15))
              s.emitted++
            }
          }
        }
      } else {
        // 풍선: 0~0.25 떠오름 → 0.25~0.85 부풀며 흔들림 → 0.85 팡! 색종이
        const rise = ease.out(seg(t, 0, 0.25))
        const pos = v.copy(s.from).lerp(s.to, rise)
        if (t < 0.45) {
          paper.visible = true
          paper.position.copy(pos)
          paper.scale.setScalar(1 - seg(t, 0.25, 0.45))
          paper.rotation.set(Math.sin(t * 10) * 0.2, t * 3, 0)
        }
        if (t >= 0.25 && t < 0.85) {
          const g = ease.out(seg(t, 0.25, 0.85))
          const r = 0.08 + 0.55 * g
          balloon.visible = true
          balloon.position.copy(pos).add(tmp.v.set(0, 0.7 * g, 0))
          const wob = 1 + Math.sin(t * 22) * 0.05 * g
          balloon.scale.set(r * wob, r * 1.12 / wob, r * wob)
        }
        if (t >= 0.85 && s.emitted === 0) {
          const center = tmp.s.copy(pos).add(tmp.v.set(0, 0.7, 0))
          for (let k = 0; k < 20; k++) emit('confetti', center)
          s.emitted = 20
        }
      }

      if (t >= DURATION) s.active = false
    })

    // 파티클 갱신
    const im = particlesRef.current
    if (!im) return
    let dirty = false
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (P.life[i] <= 0) continue
      dirty = true
      P.life[i] -= dt
      const o = i * 3
      const drag = Math.exp(-P.drag[i] * dt)
      P.vel[o] *= drag
      P.vel[o + 2] *= drag
      P.vel[o + 1] = P.vel[o + 1] * drag - P.gravity[i] * dt
      P.pos[o] += P.vel[o] * dt
      P.pos[o + 1] += P.vel[o + 1] * dt
      P.pos[o + 2] += P.vel[o + 2] * dt
      if (P.pos[o + 1] < 0.01) {
        // 바닥에 닿으면 멈춤
        P.pos[o + 1] = 0.01
        P.vel[o] = P.vel[o + 1] = P.vel[o + 2] = 0
        P.spin[o] = P.spin[o + 1] = P.spin[o + 2] = 0
      }
      P.rot[o] += P.spin[o] * dt
      P.rot[o + 1] += P.spin[o + 1] * dt
      P.rot[o + 2] += P.spin[o + 2] * dt
      const fade = P.life[i] <= 0 ? 0 : Math.min(1, P.life[i] / 0.3)
      tmp.q.setFromEuler(tmp.e.set(P.rot[o], P.rot[o + 1], P.rot[o + 2]))
      tmp.m.compose(
        tmp.p.set(P.pos[o], P.pos[o + 1], P.pos[o + 2]),
        tmp.q,
        tmp.s.set(P.size[o] * fade, P.size[o + 1] * fade, P.size[o + 2] * fade),
      )
      im.setMatrixAt(i, tmp.m)
    }
    if (dirty) im.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {Array.from({ length: SLOTS }, (_, i) => (
        <group key={i}>
          {/* 서류 한 장: 종이 + 색 띠(라벨) + 글줄 */}
          <group ref={(el) => (paperRefs.current[i] = el)} visible={false}>
            <mesh geometry={res.paperGeo} material={res.paperMat} />
            <mesh geometry={res.stripeGeo} material={res.stripeMats[i]} position={[0, 0.002, -0.23]} />
            {[-0.08, 0.03, 0.14].map((z) => (
              <mesh key={z} geometry={res.lineGeo} material={res.lineMat} position={[0, 0.003, z]} />
            ))}
          </group>
          <mesh ref={(el) => (planeRefs.current[i] = el)} geometry={res.planeGeo} material={res.planeMat} visible={false} />
          <mesh ref={(el) => (balloonRefs.current[i] = el)} geometry={res.balloonGeo} material={res.balloonMats[i]} visible={false} />
          <group ref={(el) => (eraserRefs.current[i] = el)} visible={false}>
            <mesh geometry={res.eraserGeo} material={res.eraserMat} />
            <mesh geometry={res.eraserTopGeo} material={res.eraserTopMat} position={[0, -0.06, 0]} />
          </group>
          <mesh ref={(el) => (chalkRefs.current[i] = el)} geometry={res.chalkGeo} material={res.chalkMats[i]} visible={false} />
        </group>
      ))}
      <instancedMesh ref={particlesRef} args={[res.particleGeo, res.particleMat, MAX_PARTICLES]} frustumCulled={false} />
    </group>
  )
})
