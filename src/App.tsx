import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { Playground } from './scenes/Playground'
import { Hud, type HudAction } from './components/Hud'
import { pickRandomNickname } from './data/nicknames'
import { getPlayerUi, subscribePlayer, toggleRun, toggleSit, toggleSky } from './hooks/playerStore'
import { getLapUi, onLapEvent, subscribeLaps } from './hooks/lapStore'

const SOON = '준비 중이에요'

export default function App() {
  // 접속할 때마다 무작위 이름 (새로고침하면 바뀜)
  const [name] = useState(pickRandomNickname)
  const [ready, setReady] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const bubbleTimer = useRef<number>(0)
  const toastTimer = useRef<number>(0)
  // 이름표/말풍선(drei Html)을 붙일 고정 컨테이너. 대상이 바뀌면 Html 내용이 사라지는 문제를 피함
  const labelLayer = useRef<HTMLDivElement>(null!)

  const playerUi = useSyncExternalStore(subscribePlayer, getPlayerUi)
  const lapUi = useSyncExternalStore(subscribeLaps, getLapUi)

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

  // 한 바퀴 완주 / 칭호 획득 알림
  useEffect(
    () =>
      onLapEvent((e) => {
        if (e.type === 'lap') showBubble('한 바퀴 완주!', 2200)
        else showToast(`🏅 칭호 획득! '${e.title}'`, 3500)
      }),
    [showBubble, showToast],
  )

  const handleAction = useCallback(
    (action: HudAction) => {
      switch (action) {
        case 'run':
          return toggleRun()
        case 'sit':
          return toggleSit()
        case 'sky':
          return toggleSky()
        case 'sound':
          return showToast(`소리는 ${SOON}`)
        default:
          return showToast(SOON)
      }
    },
    [showToast],
  )

  return (
    <div className="app">
      <Canvas
        className="scene"
        dpr={[1, 2]}
        shadows={false}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 45, near: 0.1, far: 900, position: [0, 6, 17] }}
        onCreated={() => requestAnimationFrame(() => setReady(true))}
      >
        <Suspense fallback={null}>
          <Playground name={name} bubble={bubble} labelLayer={labelLayer} />
        </Suspense>
      </Canvas>
      <div ref={labelLayer} className="label-layer" />

      <Hud onAction={handleAction} toast={toast} player={playerUi} laps={lapUi.laps} titles={lapUi.titles} />

      <div className={`loading ${ready ? 'done' : ''}`} aria-hidden={ready}>
        <div className="loading-dot" />
        <p>퇴근길 학교를 여는 중…</p>
      </div>
    </div>
  )
}
