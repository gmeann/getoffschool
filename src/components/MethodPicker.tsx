import { METHODS, type MethodChoice } from '../data/tasks'

type Props = { current: MethodChoice; onPick: (m: MethodChoice) => void; onClose: () => void }

/** 날리기 방식 선택 창: 4가지 + 아무거나 */
export function MethodPicker({ current, onPick, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="method-picker" role="dialog" aria-label="날리기 방식 선택" onClick={(e) => e.stopPropagation()}>
        <div className="book-head">
          <div>
            <h2>어떻게 날려 볼까요?</h2>
            <p>고른 방식은 다음에도 그대로 기억해요</p>
          </div>
          <button className="dialog-x" aria-label="선택 창 닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="method-grid">
          {METHODS.map((m) => (
            <button
              key={m.id}
              className={`method-card ${m.id === current ? 'selected' : ''} ${m.id === 'random' ? 'wide' : ''}`}
              aria-pressed={m.id === current}
              onClick={() => onPick(m.id)}
            >
              <span className="method-emoji" aria-hidden>
                {m.emoji}
              </span>
              <span className="method-name">{m.name}</span>
              <span className="method-desc">{m.desc}</span>
              {m.id === current && <span className="method-check">✓ 선택됨</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
