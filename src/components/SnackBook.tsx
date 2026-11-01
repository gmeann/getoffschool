import { useState } from 'react'
import { RARITY_LABEL, SNACKS, type Snack } from '../data/snacks'
import { SnackIcon } from './SnackIcon'

type Props = { collection: Record<string, number>; onClose: () => void }

/** 간식 도감: 20칸 격자. 모은 간식은 아이콘·이름·개수, 못 모은 칸은 실루엣과 ? */
export function SnackBook({ collection, onClose }: Props) {
  const owned = SNACKS.filter((s) => (collection[s.id] ?? 0) > 0).length
  const [selected, setSelected] = useState<Snack | null>(null)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="snack-book" role="dialog" aria-label="간식 도감" onClick={(e) => e.stopPropagation()}>
        <div className="book-head">
          <div>
            <h2>간식 도감</h2>
            <p>
              20종 중 <strong>{owned}</strong>종 수집
            </p>
          </div>
          <button className="dialog-x" aria-label="도감 닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="book-grid">
          {SNACKS.map((s) => {
            const n = collection[s.id] ?? 0
            const has = n > 0
            return (
              <button
                key={s.id}
                className={`book-cell ${has ? s.rarity : 'locked'} ${selected?.id === s.id ? 'selected' : ''}`}
                onClick={() => setSelected(has ? s : null)}
                aria-label={has ? `${s.name} ${n}개` : '아직 못 모은 간식'}
              >
                <SnackIcon snack={s} locked={!has} size={36} />
                <span className="cell-name">{has ? s.name : '???'}</span>
                {has && <span className="cell-count">×{n}</span>}
              </button>
            )
          })}
        </div>
        <div className="book-detail">
          {selected ? (
            <>
              <strong>{selected.name}</strong> <span className={`rarity ${selected.rarity}`}>{RARITY_LABEL[selected.rarity]}</span>
              <span className="detail-desc">{selected.desc}</span>
            </>
          ) : (
            <span className="detail-hint">모은 간식을 누르면 설명을 볼 수 있어요. 교무실 선생님들께 하루 한 번씩 받을 수 있어요.</span>
          )}
        </div>
      </div>
    </div>
  )
}
