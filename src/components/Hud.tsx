import { useState } from 'react'
import { ExitIcon, PersonIcon, SettingsIcon, SoundOffIcon, SoundOnIcon } from './Icons'
import { SCENES, SCENE_ORDER, type ActionId, type SceneId } from '../data/scenes'
import type { PlayerUi } from '../hooks/playerStore'
import { METHODS, type MethodChoice } from '../data/tasks'
import type { CounterSnapshot } from '../services/counterService'
import { MIND_TEXT } from '../data/mindFloat'

export type HudAction = 'exit' | 'sound' | 'settings' | ActionId

type Props = {
  sceneId: SceneId
  onAction: (action: HudAction) => void
  onScene: (id: SceneId) => void
  toast: string | null
  player: PlayerUi
  laps: number
  titles: string[]
  /** 대화창이 열려 있으면 하단 버튼은 숨김 */
  hideBottom: boolean
  /** 교실: 날린 업무 카운터, 남은 서류, 고른 방식 */
  counter: CounterSnapshot
  remaining: number
  method: MethodChoice
  /** 서버 연결이 안 되면 '혼자 보는 모드' 안내 */
  offline: boolean
  /** 소리(배경음악·효과음) 켜짐 여부 */
  soundOn: boolean
}

/** HTML 오버레이 UI (알약형 반투명 버튼) */
export function Hud({ sceneId, onAction, onScene, toast, player, laps, titles, hideBottom, counter, remaining, method, offline, soundOn }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const running = player.mode === 'run'
  const sitting = player.mode === 'sit' || player.mode === 'toSeat'

  const ALL: Record<ActionId, { active: boolean; emoji: string; label: string }> = {
    run: { active: running, emoji: running ? '✋' : '🏃', label: running ? '멈추기' : '뛰기' },
    sit: { active: sitting, emoji: sitting ? '🧍' : '🪑', label: sitting ? '일어나기' : '앉기' },
    sky: { active: player.skyLook, emoji: player.skyLook ? '👀' : '🌇', label: player.skyLook ? '그만 보기' : '하늘 보기' },
    book: { active: false, emoji: '📖', label: '도감' },
    greet: { active: false, emoji: '🙏', label: '인사하기' },
    fling: { active: false, emoji: '📄', label: '날리기' },
    method: { active: false, emoji: METHODS.find((m) => m.id === method)?.emoji ?? '✈️', label: '방식 선택' },
    add: { active: false, emoji: '➕', label: '서류 추가' },
    memo: { active: false, emoji: '📌', label: '메모보드' },
    fridge: { active: false, emoji: '🧊', label: '냉장고' },
    chalk: { active: false, emoji: '🖍️', label: '칠판' },
    mind: { active: false, emoji: MIND_TEXT.buttonEmoji, label: MIND_TEXT.button },
  }
  const flingDone = remaining <= 0
  // 운동장에서 앉아 있으면: 마음 띄우기 + 일어나기
  const actions: ActionId[] = sceneId === 'playground' && player.mode === 'sit' ? ['mind', 'sit'] : SCENES[sceneId].actions

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-left">
        <div className="hud-group left">
          <button className="pill icon" aria-label="나가기" onClick={() => onAction('exit')}>
            <ExitIcon />
          </button>
          <div className="scene-menu-wrap">
            <button
              className={`pill title ${menuOpen ? 'open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <strong>퇴근길 학교</strong>
              <span className="divider">|</span>
              <span>{SCENES[sceneId].name}</span>
              <span className="caret" aria-hidden>
                ▾
              </span>
            </button>
            {menuOpen && (
              <div className="scene-menu" role="menu">
                {SCENE_ORDER.map((id) => {
                  const s = SCENES[id]
                  const current = id === sceneId
                  return (
                    <button
                      key={id}
                      role="menuitem"
                      className={`scene-item ${s.ready ? '' : 'soon'} ${current ? 'current' : ''}`}
                      aria-disabled={!s.ready}
                      onClick={() => {
                        if (!s.ready) return
                        setMenuOpen(false)
                        if (!current) onScene(id)
                      }}
                    >
                      <span>{s.name}</span>
                      {current && <span className="tag">지금 여기</span>}
                      {!s.ready && <span className="tag">준비 중</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
          {offline && (
            <div className="pill offline-chip" role="status">
              🌙 지금은 혼자 보는 모드예요
            </div>
          )}
          {sceneId === 'classroom' && (
            <div className="pill counter" aria-label={`오늘 날린 업무 ${counter.today}장, 누적 ${counter.total}장`}>
              <span>
                📮 {counter.shared ? '오늘 선생님들이 날린 업무' : '오늘 날린 업무'} <strong>{counter.today}</strong>장
              </span>
              <span className="sep">·</span>
              <span>
                누적 <strong>{counter.total}</strong>장
              </span>
            </div>
          )}
        </div>

        <div className="hud-right">
          <div className="hud-right-main">
            <div className="pill count" aria-label={`오늘 ${counter.visitors}명 다녀감`}>
              <PersonIcon />
              오늘 {counter.visitors}명
            </div>
            <div className="pill laps" aria-label={`오늘 나는 ${laps}바퀴`}>
              👟 오늘 나는 <strong>{laps.toFixed(1)}</strong>바퀴
              {sceneId === 'playground' && counter.shared && <span className="laps-all">· 모두 {counter.lapsToday}바퀴</span>}
            </div>
            <div className="hud-group icons">
              <button
                className={`pill icon ${soundOn ? 'on' : ''}`}
                aria-label={soundOn ? '소리 끄기' : '소리 켜기'}
                aria-pressed={soundOn}
                onClick={() => onAction('sound')}
              >
                {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
              </button>
              <button className="pill icon" aria-label="설정" onClick={() => onAction('settings')}>
                <SettingsIcon />
              </button>
            </div>
          </div>
          {titles.map((t) => (
            <div key={t} className="pill badge">
              🏅 {t}
            </div>
          ))}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {!hideBottom && (
        <div className={`hud-bottom ${actions.length >= 4 ? 'many' : ''}`}>
          {actions.map((id) => {
            const a = ALL[id]
            return (
              <button
                key={id}
                className={`pill action ${a.active ? 'active' : ''} ${id === 'fling' && flingDone ? 'dim' : ''}`}
                aria-pressed={a.active}
                onClick={() => onAction(id)}
              >
                <span aria-hidden>{a.emoji}</span>
                {a.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
