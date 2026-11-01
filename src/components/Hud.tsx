import { ExitIcon, PersonIcon, SettingsIcon, SoundOffIcon } from './Icons'
import { TODAY_VISITORS } from '../data/world'
import type { PlayerUi } from '../hooks/playerStore'

export type HudAction = 'exit' | 'sound' | 'settings' | 'run' | 'sit' | 'sky'

type Props = {
  onAction: (action: HudAction) => void
  toast: string | null
  player: PlayerUi
  laps: number
  titles: string[]
}

/** HTML 오버레이 UI (알약형 반투명 버튼) */
export function Hud({ onAction, toast, player, laps, titles }: Props) {
  const running = player.mode === 'run'
  const sitting = player.mode === 'sit' || player.mode === 'toBench'
  const actions = [
    { id: 'run' as const, active: running, emoji: running ? '✋' : '🏃', label: running ? '멈추기' : '뛰기' },
    { id: 'sit' as const, active: sitting, emoji: sitting ? '🧍' : '🪑', label: sitting ? '일어나기' : '앉기' },
    { id: 'sky' as const, active: player.skyLook, emoji: player.skyLook ? '👀' : '🌇', label: player.skyLook ? '그만 보기' : '하늘 보기' },
  ]

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-group">
          <button className="pill icon" aria-label="나가기" onClick={() => onAction('exit')}>
            <ExitIcon />
          </button>
          <div className="pill title">
            <strong>퇴근길 학교</strong>
            <span className="divider">|</span>
            <span>운동장</span>
          </div>
        </div>

        <div className="hud-right">
          <div className="hud-right-main">
            <div className="pill count" aria-label={`오늘 ${TODAY_VISITORS}명 방문`}>
              <PersonIcon />
              오늘 {TODAY_VISITORS}명
            </div>
            <div className="pill laps" aria-label={`오늘 나는 ${laps}바퀴`}>
              👟 오늘 나는 <strong>{laps.toFixed(1)}</strong>바퀴
            </div>
            <div className="hud-group icons">
              <button className="pill icon" aria-label="소리 꺼짐" onClick={() => onAction('sound')}>
                <SoundOffIcon />
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

      <div className="hud-bottom">
        {actions.map((a) => (
          <button
            key={a.id}
            className={`pill action ${a.active ? 'active' : ''}`}
            aria-pressed={a.active}
            onClick={() => onAction(a.id)}
          >
            <span aria-hidden>{a.emoji}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
