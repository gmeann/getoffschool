import { Suspense, useCallback, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Playground } from './scenes/Playground'
import { Hud } from './components/Hud'
import { pickRandomNickname } from './data/nicknames'

const BOTTOM_ACTIONS = ['뛰기', '앉기', '하늘 보기']
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

  const handleAction = useCallback((label: string) => {
    if (BOTTOM_ACTIONS.includes(label)) {
      // 하단 버튼: 캐릭터 머리 위 말풍선
      setBubble(SOON)
      window.clearTimeout(bubbleTimer.current)
      bubbleTimer.current = window.setTimeout(() => setBubble(null), 1600)
    } else {
      setToast(label === '소리' ? `소리는 ${SOON}` : SOON)
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setToast(null), 1600)
    }
  }, [])

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

      <Hud onAction={handleAction} toast={toast} />

      <div className={`loading ${ready ? 'done' : ''}`} aria-hidden={ready}>
        <div className="loading-dot" />
        <p>퇴근길 학교를 여는 중…</p>
      </div>
    </div>
  )
}
