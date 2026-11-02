import { CHEERS, CHEER_BASE, REACTION_EMOJIS } from '../data/reactions'

type Props = {
  onPick: (id: number) => void
  onClose: () => void
}

/** 반응 고르기: 이모지 8개 + 응원 한마디 8개 (직접 쓰는 칸 없음) */
export function ReactionPicker({ onPick, onClose }: Props) {
  return (
    <div className="sheet-backdrop light" onClick={onClose}>
      <div className="reaction-picker" role="dialog" aria-label="반응 보내기" onClick={(e) => e.stopPropagation()}>
        <div className="reaction-head">
          <strong>반응 보내기</strong>
          <button className="dialog-x" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="reaction-emojis">
          {REACTION_EMOJIS.map((e, i) => (
            <button key={e} className="reaction-emoji" aria-label={`${e} 띄우기`} onClick={() => onPick(i)}>
              {e}
            </button>
          ))}
        </div>
        <div className="reaction-cheers">
          {CHEERS.map((c, i) => (
            <button key={c} className="reaction-cheer" onClick={() => onPick(CHEER_BASE + i)}>
              {c}
            </button>
          ))}
        </div>
        <p className="reaction-hint">
          <span className="real-dot" aria-hidden /> 초록 점 선생님을 누르면 가까이 가서 인사해요
        </p>
      </div>
    </div>
  )
}
