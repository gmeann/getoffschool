import type { NpcDef } from '../data/npcs'
import { RARITY_LABEL, type Snack } from '../data/snacks'
import { SnackIcon } from './SnackIcon'

type Props = {
  npc: NpcDef
  text: string
  received: boolean
  gift: Snack | null
  onSnack: () => void
  onClose: () => void
}

/** 하단에서 올라오는 대화창: NPC 직책 + 대사 + 버튼 */
export function DialogSheet({ npc, text, received, gift, onSnack, onClose }: Props) {
  return (
    <div className="dialog-sheet" role="dialog" aria-label={`${npc.title}와 대화`}>
      <div className="dialog-head">
        <span className="dialog-dot" style={{ background: npc.look.top }} />
        <strong>{npc.title}</strong>
        <button className="dialog-x" aria-label="대화 닫기" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="dialog-text">{text}</p>
      {gift && (
        <div className={`gift-card ${gift.rarity}`}>
          <SnackIcon snack={gift} size={44} />
          <div>
            <div className="gift-name">
              {gift.name} <span className={`rarity ${gift.rarity}`}>{RARITY_LABEL[gift.rarity]}</span>
            </div>
            <div className="gift-desc">{gift.desc}</div>
          </div>
        </div>
      )}
      <div className="dialog-buttons">
        <button className="dialog-btn primary" disabled={received} onClick={onSnack}>
          🍪 {received ? '오늘은 받았어요' : '간식 받기'}
        </button>
        <button className="dialog-btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}
