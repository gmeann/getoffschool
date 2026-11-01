import { CRISIS_CONTACT, CRISIS_TEXT } from '../data/mindFloat'

/** 위기 신호가 보였을 때의 따뜻한 안내 창 (감지 여부는 어디에도 기록하지 않음) */
export function CrisisDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="crisis-card" role="alertdialog" aria-label={CRISIS_TEXT.title} onClick={(e) => e.stopPropagation()}>
        <div className="crisis-emoji" aria-hidden>
          🫂
        </div>
        <h2>{CRISIS_TEXT.title}</h2>
        {CRISIS_TEXT.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <a className="dialog-btn primary crisis-call" href={`tel:${CRISIS_CONTACT.number}`}>
          📞 {CRISIS_TEXT.call}
        </a>
        <button className="dialog-btn" onClick={onClose}>
          {CRISIS_TEXT.close}
        </button>
      </div>
    </div>
  )
}
