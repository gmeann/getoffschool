import { ExitIcon, PersonIcon, SettingsIcon, SoundOffIcon } from './Icons'
import { TODAY_VISITORS } from '../data/world'

type Props = {
  onAction: (label: string) => void
  toast: string | null
}

const ACTIONS = [
  { label: '뛰기', emoji: '🏃' },
  { label: '앉기', emoji: '🪑' },
  { label: '하늘 보기', emoji: '🌇' },
]

/** HTML 오버레이 UI (알약형 반투명 버튼) */
export function Hud({ onAction, toast }: Props) {
  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-group">
          <button className="pill icon" aria-label="나가기" onClick={() => onAction('나가기')}>
            <ExitIcon />
          </button>
          <div className="pill title">
            <strong>퇴근길 학교</strong>
            <span className="divider">|</span>
            <span>운동장</span>
          </div>
        </div>
        <div className="hud-group right">
          <div className="pill count" aria-label={`오늘 ${TODAY_VISITORS}명 방문`}>
            <PersonIcon />
            오늘 {TODAY_VISITORS}명
          </div>
          <div className="hud-group">
            <button className="pill icon" aria-label="소리 꺼짐" onClick={() => onAction('소리')}>
              <SoundOffIcon />
            </button>
            <button className="pill icon" aria-label="설정" onClick={() => onAction('설정')}>
              <SettingsIcon />
            </button>
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <div className="hud-bottom">
        {ACTIONS.map((a) => (
          <button key={a.label} className="pill action" onClick={() => onAction(a.label)}>
            <span aria-hidden>{a.emoji}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
