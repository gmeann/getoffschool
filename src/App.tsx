import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { Playground } from './scenes/Playground'
import { Office } from './scenes/Office'
import { Classroom } from './scenes/Classroom'
import { Lab } from './scenes/Lab'
import { BoardPanel } from './components/BoardPanel'
import { LAB_OBJECTS } from './data/lab'
import type { BoardId } from './data/boards'
import { markLabGuideSeen, shouldShowLabGuide } from './hooks/onboarding'
import { MindCompose } from './components/MindCompose'
import { CrisisDialog } from './components/CrisisDialog'
import { MIND_TEXT } from './data/mindFloat'
import { hasCrisisSignal } from './services/mindSafety'
import { floatedToday, markFloatedToday } from './hooks/mindStore'
import * as THREE from 'three'
import { HeartPanel } from './components/HeartPanel'
import { heartService, HeartError, type Heart } from './services/heartService'
import { getFirebase, getNetStatus, isOnline, subscribeNetStatus } from './services/firebase'
import type { HeartKind } from './data/hearts'
import { MethodPicker } from './components/MethodPicker'
import { AddPaper } from './components/AddPaper'
import { pileTop } from './components/PaperPile'
import type { TaskEffectsHandle } from './components/TaskEffects'
import { TITLE_DONE } from './data/tasks'
import { addCustomPaper, flingOne, getTaskUi, setMethod, subscribeTasks } from './hooks/taskStore'
import { counterService } from './services/counterService'
import { Hud, type HudAction } from './components/Hud'
import { DialogSheet } from './components/DialogSheet'
import { SnackBook } from './components/SnackBook'
import { SnackIcon } from './components/SnackIcon'
import { pickRandomNickname } from './data/nicknames'
import { SCENES, doorFront, type Door, type SceneId } from './data/scenes'
import { ALREADY_LINES, NPCS, NPC_BY_ID, pickFrom, pickNpcLine, type NpcDef, type NpcId } from './data/npcs'
import type { Snack } from './data/snacks'
import {
  bow,
  getPlayerUi,
  player,
  resetForScene,
  subscribePlayer,
  toggleRun,
  toggleSit,
  toggleSky,
  walkTo,
} from './hooks/playerStore'
import { getLapUi, onLapEvent, subscribeLaps } from './hooks/lapStore'
import { getSnackUi, receiveSnack, receivedToday, subscribeSnacks } from './hooks/snackStore'

const SOON = '준비 중이에요'
const FADE_MS = 450
/** 이만큼 멀어지면 대화창이 저절로 닫힘 */
const DIALOG_KEEP_DISTANCE = 3.6
/** 인사하기가 닿는 거리 */
const GREET_DISTANCE = 4

type Dialog = { npc: NpcDef; text: string; gift: Snack | null }

export default function App() {
  // 접속할 때마다 무작위 이름 (새로고침하면 바뀜)
  const [name] = useState(pickRandomNickname)
  const [ready, setReady] = useState(false)
  const [sceneId, setSceneId] = useState<SceneId>('playground')
  const [fading, setFading] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState<BoardId | null>(null)
  const [labGuide, setLabGuide] = useState(false)
  // 마음 띄우기: 글은 이 상태(메모리)에만 있고, 연출이 끝나면 바로 비움. 저장·전송·로그 없음
  const [mindOpen, setMindOpen] = useState(false)
  const [cloud, setCloud] = useState<{ key: number; text: string; origin: THREE.Vector3; crisis: boolean } | null>(null)
  const [crisisOpen, setCrisisOpen] = useState(false)
  // 6단계: 하늘의 나눈 마음 구름 (운동장에 들어갈 때 한 번 불러옴)
  const [hearts, setHearts] = useState<Heart[]>([])
  const [heartOpen, setHeartOpen] = useState<Heart | null>(null)
  const [heartNotice, setHeartNotice] = useState<string | null>(null)
  const netStatus = useSyncExternalStore(subscribeNetStatus, getNetStatus)
  const effectsRef = useRef<TaskEffectsHandle | null>(null)
  const [floatSnack, setFloatSnack] = useState<{ snack: Snack; key: number } | null>(null)
  const [npcBubbles, setNpcBubbles] = useState<Partial<Record<NpcId, string>>>({})
  const [npcBows, setNpcBows] = useState<Partial<Record<NpcId, number>>>({})
  const bubbleTimer = useRef<number>(0)
  const toastTimer = useRef<number>(0)
  const npcTimers = useRef<Partial<Record<NpcId, number>>>({})
  const transitioning = useRef(false)
  // 이름표/말풍선(drei Html)을 붙일 고정 컨테이너. 대상이 바뀌면 Html 내용이 사라지는 문제를 피함
  const labelLayer = useRef<HTMLDivElement>(null!)

  const playerUi = useSyncExternalStore(subscribePlayer, getPlayerUi)
  const lapUi = useSyncExternalStore(subscribeLaps, getLapUi)
  const snackUi = useSyncExternalStore(subscribeSnacks, getSnackUi)
  const taskUi = useSyncExternalStore(subscribeTasks, getTaskUi)
  const counter = useSyncExternalStore(counterService.subscribe, counterService.getSnapshot)

  const showBubble = useCallback((text: string, ms = 1800) => {
    setBubble(text)
    window.clearTimeout(bubbleTimer.current)
    bubbleTimer.current = window.setTimeout(() => setBubble(null), ms)
  }, [])

  const showToast = useCallback((text: string, ms = 1800) => {
    setToast(text)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), ms)
  }, [])

  const showNpcBubble = useCallback((id: NpcId, text: string, ms = 2600) => {
    setNpcBubbles((b) => ({ ...b, [id]: text }))
    window.clearTimeout(npcTimers.current[id])
    npcTimers.current[id] = window.setTimeout(() => setNpcBubbles((b) => ({ ...b, [id]: undefined })), ms)
  }, [])

  // 한 바퀴 완주 / 칭호 획득 알림
  useEffect(
    () =>
      onLapEvent((e) => {
        if (e.type === 'lap') {
          showBubble('한 바퀴 완주!', 2200)
          counterService.addLaps(1) // 모두의 바퀴 합계에 더함 (모았다가 10초마다 전송)
        }
        // 업무 완료 칭호는 완료 문구와 함께 따로 보여 줌
        else if (e.title !== TITLE_DONE) showToast(`🏅 칭호 획득! '${e.title}'`, 3500)
      }),
    [showBubble, showToast],
  )

  // ---------- 공간 이동 (페이드) ----------
  const goToScene = useCallback(
    (to: SceneId) => {
      const def = SCENES[to]
      if (!def.ready || transitioning.current || to === sceneId) return
      transitioning.current = true
      setDialog(null)
      setBookOpen(false)
      setPickerOpen(false)
      setAddOpen(false)
      setBoardOpen(null)
      setMindOpen(false)
      setCloud(null)
      setCrisisOpen(false)
      setHeartOpen(null)
      player.mindView = 0
      void counterService.flush() // 장면을 나갈 때 모아 둔 증가분 전송
      setFading(true)
      window.setTimeout(() => {
        // 화면이 완전히 어두워진 뒤 장면 교체 (이전 장면은 언마운트되며 자원 정리)
        resetForScene(def.spawnFrom?.[sceneId] ?? def.spawn)
        setNpcBubbles({})
        setSceneId(to)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setFading(false)
            window.setTimeout(() => (transitioning.current = false), FADE_MS)
          }),
        )
      }, FADE_MS)
    },
    [sceneId],
  )

  const handleDoor = useCallback(
    (door: Door) => {
      const front = doorFront(door, 1.0)
      walkTo(front, {
        x: door.x,
        z: door.z,
        radius: 1.7,
        onArrive: () => {
          if (SCENES[door.to].ready) goToScene(door.to)
          else showBubble(SOON)
        },
      })
    },
    [goToScene, showBubble],
  )

  // ---------- NPC 대화 ----------
  const openDialog = useCallback((npc: NpcDef) => {
    const text = receivedToday(npc.id) ? pickFrom(ALREADY_LINES) : pickNpcLine(npc.id, floatedToday())
    setDialog({ npc, text, gift: null })
  }, [])

  const handleNpc = useCallback(
    (npc: NpcDef) => {
      walkTo(npc.talkFrom, { x: npc.x, z: npc.z, radius: 2.2, onArrive: () => openDialog(npc) })
    },
    [openDialog],
  )

  const handleSnack = useCallback(() => {
    if (!dialog) return
    const snack = receiveSnack(dialog.npc.id)
    if (!snack) {
      setDialog({ ...dialog, text: pickFrom(ALREADY_LINES) })
      return
    }
    setDialog({ ...dialog, text: dialog.npc.giveLine(snack.name), gift: snack })
    setFloatSnack({ snack, key: Date.now() })
    showBubble(`${snack.emoji ?? '🍪'} ${snack.name} 받았어요!`, 2200)
  }, [dialog, showBubble])

  // 멀어지면 대화창 닫기
  useEffect(() => {
    if (!dialog) return
    const id = window.setInterval(() => {
      const d = Math.hypot(player.position.x - dialog.npc.x, player.position.z - dialog.npc.z)
      if (d > DIALOG_KEEP_DISTANCE) setDialog(null)
    }, 250)
    return () => window.clearInterval(id)
  }, [dialog])

  // ---------- 인사하기 ----------
  const greet = useCallback(() => {
    let best: NpcDef | null = null
    let bestD = Infinity
    for (const n of NPCS) {
      const d = Math.hypot(player.position.x - n.x, player.position.z - n.z)
      if (d < bestD) {
        bestD = d
        best = n
      }
    }
    if (!best || bestD > GREET_DISTANCE) {
      bow()
      showBubble('가까이 가서 인사해 볼까요?')
      return
    }
    const npc = best
    bow(npc)
    window.setTimeout(() => {
      setNpcBows((b) => ({ ...b, [npc.id]: Date.now() }))
      showNpcBubble(npc.id, pickFrom(npc.greetings))
    }, 350)
  }, [showBubble, showNpcBubble])

  // ---------- 연구실 게시판 ----------
  const openBoard = useCallback((b: BoardId) => {
    const o = LAB_OBJECTS[b]
    walkTo(o.front, { x: o.x, z: o.z, radius: 2.0, onArrive: () => setBoardOpen(b) })
  }, [])

  // 앱 시작: 익명 로그인 → 오늘 방문 집계 → 카운터 읽기 (실패해도 혼자 보는 모드로 계속)
  useEffect(() => {
    void getFirebase()
    counterService.start()
  }, [])

  // 장면에 들어갈 때만 카운터를 한 번 읽음 (실시간 구독 없음)
  useEffect(() => {
    if (ready) void counterService.refresh()
  }, [sceneId, ready])

  // 운동장에 들어갈 때 나눈 마음 구름을 한 번 불러옴
  useEffect(() => {
    if (sceneId !== 'playground') return
    let alive = true
    void heartService.getHearts().then((list) => alive && setHearts(list))
    return () => {
      alive = false
    }
  }, [sceneId, netStatus === 'online'])

  const reactHeart = useCallback(async (h: Heart, kind: HeartKind) => {
    try {
      const next = await heartService.toggleReaction(h, kind)
      setHearts((list) => list.map((x) => (x.id === next.id ? next : x)))
      setHeartOpen(next)
    } catch (e) {
      setHeartNotice(e instanceof HeartError ? e.message : '반응을 남기지 못했어요')
      window.setTimeout(() => setHeartNotice(null), 2400)
    }
  }, [])

  const reportHeart = useCallback(async (h: Heart) => {
    try {
      await heartService.report(h)
      setHearts((list) => list.filter((x) => x.id !== h.id))
      setHeartOpen(null)
      showToast('신고가 접수됐어요. 이 구름은 하늘에서 빼 둘게요', 2600)
    } catch (e) {
      setHeartNotice(e instanceof HeartError ? e.message : '신고하지 못했어요')
      window.setTimeout(() => setHeartNotice(null), 2400)
    }
  }, [showToast])

  const deleteHeart = useCallback(async (h: Heart) => {
    try {
      await heartService.deleteMine(h)
      setHearts((list) => list.filter((x) => x.id !== h.id))
      setHeartOpen(null)
      showToast('내가 나눈 마음을 지웠어요', 2000)
    } catch (e) {
      setHeartNotice(e instanceof HeartError ? e.message : '지우지 못했어요')
      window.setTimeout(() => setHeartNotice(null), 2400)
    }
  }, [showToast])

  // 연구실에 처음 들어오면 한 번만 안내
  useEffect(() => {
    if (sceneId === 'lab' && shouldShowLabGuide()) setLabGuide(true)
  }, [sceneId])

  // ---------- 마음 띄우기 ----------
  const openMind = useCallback(() => {
    // 앉아 있을 때만, 이전 구름이 다 사라진 뒤에만 열림
    if (cloud || player.mode !== 'sit') return
    player.mindView = 1
    setMindOpen(true)
  }, [cloud])

  const closeMind = useCallback(() => {
    setMindOpen(false)
    player.mindView = 0
  }, [])

  const sendMind = useCallback((text: string, share: boolean) => {
    setMindOpen(false)
    const crisis = hasCrisisSignal(text)
    // 나누기를 켠 경우에만 서버로 보냄. 위기 신호가 있으면 나누지 않고 혼자 띄우기만
    if (share && !crisis) {
      heartService
        .addHeart(text, name)
        .then((h) => {
          setHearts((list) => [h, ...list].slice(0, 12))
          showToast(MIND_TEXT.shareDone, 2800)
        })
        .catch(() => showToast(MIND_TEXT.shareFailed, 2800))
    } else if (share && crisis) {
      showToast(MIND_TEXT.shareCrisis, 2400)
    }
    const origin = new THREE.Vector3(player.position.x, 2.45 + player.sitLift, player.position.z)
    setCloud({ key: Date.now(), text, origin, crisis })
    player.mindView = 2
    // 저장하는 건 "오늘 띄웠다"는 날짜 하나뿐
    markFloatedToday()
  }, [name, showToast])

  const cloudDone = useCallback(() => {
    const crisis = cloud?.crisis ?? false
    setCloud(null) // 글 내용을 화면·메모리에서 지움
    player.mindView = 0
    if (crisis) setCrisisOpen(true)
    else showBubble(pickFrom(MIND_TEXT.doneLines), 3200)
  }, [cloud, showBubble])

  // ---------- 업무 날리기 ----------
  const fling = useCallback(() => {
    const before = getTaskUi().remaining
    const r = flingOne()
    if (!r) {
      showToast('오늘 서류는 다 날렸어요. 내일 또 쌓여요 🌙 (서류 추가로 더 올릴 수도 있어요)', 2600)
      return
    }
    effectsRef.current?.play(r.method, r.label, pileTop(before))
    showBubble(r.line, 1600)
    if (r.done) {
      window.setTimeout(() => showToast(`🎉 오늘 업무 끝! 퇴근 준비 완료 · 🏅 칭호 '${TITLE_DONE}'`, 4200), 900)
    }
  }, [showBubble, showToast])

  const handleAction = useCallback(
    (action: HudAction) => {
      switch (action) {
        case 'run':
          return toggleRun()
        case 'sit':
          return toggleSit()
        case 'sky':
          return toggleSky()
        case 'book':
          return setBookOpen(true)
        case 'greet':
          return greet()
        case 'fling':
          return fling()
        case 'method':
          return setPickerOpen(true)
        case 'add':
          return setAddOpen(true)
        case 'memo':
        case 'fridge':
        case 'chalk':
          return openBoard(action)
        case 'mind':
          return openMind()
        case 'sound':
          return showToast(`소리는 ${SOON}`)
        default:
          return showToast(SOON)
      }
    },
    [showToast, greet, fling, openBoard, openMind],
  )

  const sceneProps = { name, bubble, labelLayer, onDoor: handleDoor }

  return (
    <div className="app">
      <Canvas
        className="scene"
        dpr={[1, 2]}
        shadows={false}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 45, near: 0.1, far: 900, position: [0, 6, 17] }}
        onCreated={(state) => {
          // 개발 중 자동 확인용 (배포 빌드에는 들어가지 않음)
          if (import.meta.env.DEV) Object.assign(window, { __three: state })
          requestAnimationFrame(() => setReady(true))
        }}
      >
        <Suspense fallback={null}>
          {/* 한 번에 한 장면만 불러옴. key 가 바뀌면 이전 장면은 통째로 정리됨 */}
          {sceneId === 'playground' && (
            <Playground
              key="playground"
              {...sceneProps}
              cloud={cloud ? { key: cloud.key, text: cloud.text, origin: cloud.origin } : null}
              onCloudDone={cloudDone}
              hearts={hearts}
              onHeart={(h) => setHeartOpen(h)}
            />
          )}
          {sceneId === 'classroom' && (
            <Classroom
              key="classroom"
              {...sceneProps}
              effectsRef={effectsRef}
              remaining={taskUi.remaining}
              custom={taskUi.custom}
              topLabel={taskUi.topLabel}
              onFling={fling}
            />
          )}
          {sceneId === 'lab' && <Lab key="lab" {...sceneProps} onBoard={openBoard} />}
          {sceneId === 'office' && (
            <Office key="office" {...sceneProps} onNpc={handleNpc} npcBubbles={npcBubbles} npcBows={npcBows} />
          )}
        </Suspense>
      </Canvas>
      <div ref={labelLayer} className="label-layer" />

      <Hud
        sceneId={sceneId}
        onAction={handleAction}
        onScene={goToScene}
        toast={toast}
        player={playerUi}
        laps={lapUi.laps}
        titles={lapUi.titles}
        hideBottom={!!dialog || !!boardOpen || mindOpen || !!cloud || !!heartOpen}
        counter={counter}
        remaining={taskUi.remaining}
        method={taskUi.method}
        offline={netStatus === 'offline'}
      />

      {dialog && (
        <DialogSheet
          key={dialog.npc.id}
          npc={NPC_BY_ID[dialog.npc.id]}
          text={dialog.text}
          gift={dialog.gift}
          received={receivedToday(dialog.npc.id, snackUi)}
          onSnack={handleSnack}
          onClose={() => setDialog(null)}
        />
      )}

      {floatSnack && (
        <div key={floatSnack.key} className="snack-float" onAnimationEnd={() => setFloatSnack(null)}>
          <SnackIcon snack={floatSnack.snack} size={56} />
        </div>
      )}

      {pickerOpen && (
        <MethodPicker
          current={taskUi.method}
          onPick={(m) => {
            setMethod(m)
            setPickerOpen(false)
            showToast(m === 'random' ? '🎲 날릴 때마다 무작위로 골라요' : '방식을 바꿨어요. 날려 볼까요?', 1600)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {addOpen && (
        <AddPaper
          customCount={taskUi.custom}
          onAdd={(name) => {
            const r = addCustomPaper(name)
            if (!r.ok) return r.reason
            showToast(`📄 '${r.label.name}' 서류를 더미 맨 위에 올렸어요`, 2000)
            return null
          }}
          onClose={() => setAddOpen(false)}
        />
      )}

      {/* 구름이 떠오르는 동안 3D 클릭 이동 막기 */}
      {cloud && <div className="input-blocker" aria-hidden />}
      {mindOpen && (
        <MindCompose
          onSend={sendMind}
          onClose={closeMind}
          shareCheck={() => (isOnline() ? heartService.cooldownLeft() : -1)}
        />
      )}
      {heartOpen && (
        <HeartPanel
          heart={heartOpen}
          onReact={reactHeart}
          onReport={reportHeart}
          onDelete={deleteHeart}
          onClose={() => setHeartOpen(null)}
          notice={heartNotice}
        />
      )}
      {crisisOpen && <CrisisDialog onClose={() => setCrisisOpen(false)} />}

      {boardOpen && <BoardPanel key={boardOpen} board={boardOpen} myName={name} onClose={() => setBoardOpen(null)} />}

      {labGuide && (
        <div className="modal-backdrop" onClick={() => (markLabGuideSeen(), setLabGuide(false))}>
          <div className="guide-card" role="dialog" aria-label="연구실 안내" onClick={(e) => e.stopPropagation()}>
            <div className="guide-emoji" aria-hidden>
              📌🧊🖍️
            </div>
            <p>
              여기서 선생님들의 한마디를 읽고 남길 수 있어요.
              <br />
              개인정보는 적지 않아요.
            </p>
            <button
              className="dialog-btn primary"
              onClick={() => {
                markLabGuideSeen()
                setLabGuide(false)
              }}
            >
              알겠어요
            </button>
          </div>
        </div>
      )}

      {bookOpen && <SnackBook collection={snackUi.collection} onClose={() => setBookOpen(false)} />}

      <div className={`fade ${fading ? 'on' : ''}`} aria-hidden />

      <div className={`loading ${ready ? 'done' : ''}`} aria-hidden={ready}>
        <div className="loading-dot" />
        <p>퇴근길 학교를 여는 중…</p>
      </div>
    </div>
  )
}
