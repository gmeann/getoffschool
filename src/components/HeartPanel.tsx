import { useState } from 'react'
import { HEART_REACTIONS, type HeartKind } from '../data/hearts'
import type { Heart } from '../services/heartService'

type Props = {
  heart: Heart
  onReact: (h: Heart, kind: HeartKind) => void
  onReport: (h: Heart) => void
  onDelete: (h: Heart) => void
  onClose: () => void
  notice: string | null
}

function timeAgo(t: number) {
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`
}

/** 하늘 구름을 누르면 열리는 마음 (글은 텍스트로만 그림, 댓글 없음) */
export function HeartPanel({ heart, onReact, onReport, onDelete, onClose, notice }: Props) {
  const [ask, setAsk] = useState<'report' | 'delete' | null>(null)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="heart-sheet" role="dialog" aria-label="선생님이 나눈 마음" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <h2>☁️ 선생님이 나눈 마음</h2>
            <p>
              {heart.nick} · {timeAgo(heart.createdAt)}
              {heart.mine && <em className="mine-tag">내 글</em>}
            </p>
          </div>
          <button className="dialog-x" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        <p className="heart-text">{heart.text}</p>
        <div className="heart-reactions">
          {HEART_REACTIONS.map((r) => (
            <button
              key={r.kind}
              className={`react-btn big ${heart.myReaction === r.kind ? 'on' : ''}`}
              aria-pressed={heart.myReaction === r.kind}
              onClick={() => onReact(heart, r.kind)}
            >
              <span aria-hidden>{r.emoji}</span> {r.label} <strong>{heart.counts[r.kind]}</strong>
            </button>
          ))}
        </div>
        <p className="heart-hint">반응은 한 글에 하나만 남길 수 있어요. 다시 누르면 취소돼요.</p>
        {!heart.seed && (
          <div className="heart-actions">
            {ask ? (
              <span className="confirm">
                {ask === 'report' ? '이 글을 신고할까요?' : '내가 나눈 글을 지울까요?'}
                <button className="mini danger" onClick={() => (ask === 'report' ? onReport(heart) : onDelete(heart))}>
                  {ask === 'report' ? '신고' : '지우기'}
                </button>
                <button className="mini" onClick={() => setAsk(null)}>
                  취소
                </button>
              </span>
            ) : heart.mine ? (
              <button className="mini" onClick={() => setAsk('delete')}>
                삭제
              </button>
            ) : (
              <button className="mini ghost" onClick={() => setAsk('report')}>
                신고
              </button>
            )}
          </div>
        )}
        {notice && (
          <div className="sheet-notice" role="status">
            {notice}
          </div>
        )}
      </section>
    </div>
  )
}
