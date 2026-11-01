import { useEffect, useRef, useState } from 'react'
import { ANONYMOUS, BOARDS, MEMO_COLORS, POST_MAX, REASON_MAX, type BoardId, type MemoColor } from '../data/boards'
import { boardService, BoardError, type Post, type SortMode } from '../services/boardService'
import { checkText } from '../services/moderation'
import { useBoard, useKeyboardInset } from '../hooks/useBoard'

/**
 * 메모보드·냉장고·칠판이 함께 쓰는 하단 시트 패널.
 * 데이터는 boardService 로만 읽고 씀. 사용자가 쓴 글은 React 텍스트로만 그림 (HTML 해석 없음).
 */

type Props = { board: BoardId; myName: string; onClose: () => void }

function timeAgo(t: number) {
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

const colorHex = (c?: MemoColor) => MEMO_COLORS.find((x) => x.id === c)?.hex ?? MEMO_COLORS[0].hex
const len = (s: string) => [...s].length

function PostCard({
  post,
  board,
  highlight,
  onReact,
  onDelete,
  onReport,
}: {
  post: Post
  board: BoardId
  highlight: boolean
  onReact: (p: Post) => void
  onDelete: (p: Post) => void
  onReport: (p: Post) => void
}) {
  const cfg = BOARDS[board]
  const [confirm, setConfirm] = useState(false)
  const [reportAsk, setReportAsk] = useState(false)
  return (
    <li
      className={`post-card ${board} ${highlight ? 'fresh' : ''}`}
      style={board === 'memo' ? { background: colorHex(post.color) } : undefined}
    >
      {board === 'fridge' && <span className="magnet" aria-hidden />}
      <p className="post-text">{post.text}</p>
      {post.reason && (
        <p className="post-reason">
          <span>추천 이유</span>
          {post.reason}
        </p>
      )}
      <div className="post-foot">
        <span className="post-meta">
          {post.author} · {timeAgo(post.createdAt)}
          {post.mine && <em className="mine-tag">내 글</em>}
        </span>
        <span className="post-actions">
          {!post.mine &&
            !post.seed &&
            (reportAsk ? (
              <span className="confirm">
                신고할까요?
                <button className="mini danger" onClick={() => onReport(post)}>
                  신고
                </button>
                <button className="mini" onClick={() => setReportAsk(false)}>
                  취소
                </button>
              </span>
            ) : (
              <button className="mini ghost" onClick={() => setReportAsk(true)} aria-label="이 글 신고하기">
                신고
              </button>
            ))}
          {post.mine &&
            (confirm ? (
              <span className="confirm">
                정말 지울까요?
                <button className="mini danger" onClick={() => onDelete(post)}>
                  지우기
                </button>
                <button className="mini" onClick={() => setConfirm(false)}>
                  취소
                </button>
              </span>
            ) : (
              <button className="mini" onClick={() => setConfirm(true)}>
                삭제
              </button>
            ))}
          <button className={`react-btn ${post.reacted ? 'on' : ''}`} aria-pressed={post.reacted} onClick={() => onReact(post)}>
            <span aria-hidden>{cfg.reactionEmoji}</span> {cfg.reaction} <strong>{post.reactions}</strong>
          </button>
        </span>
      </div>
    </li>
  )
}

function Compose({ board, myName, onDone, onCancel }: { board: BoardId; myName: string; onDone: (p: Post) => void; onCancel: () => void }) {
  const cfg = BOARDS[board]
  const [text, setText] = useState('')
  const [reason, setReason] = useState('')
  const [color, setColor] = useState<MemoColor>('yellow')
  const [anon, setAnon] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // 연속 입력 제한: 남은 시간을 1초마다 갱신
  useEffect(() => {
    let alive = true
    const tick = async () => {
      const ms = await boardService.getCooldownRemaining()
      if (alive) setCooldown(ms)
    }
    void tick()
    const id = window.setInterval(tick, 1000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  const noNewline = (v: string) => v.replace(/[\r\n]+/g, ' ')

  const submit = async () => {
    if (busy) return
    if (cooldown > 0) {
      setError(`잠시 후에 다시 남겨 주세요 (${Math.ceil(cooldown / 1000)}초)`)
      return
    }
    const main = checkText(text, POST_MAX)
    if (!main.ok) return setError(main.reason)
    if (cfg.hasReason) {
      const r = checkText(reason, REASON_MAX)
      if (!r.ok) return setError(r.reason === '내용을 적어 주세요' ? '추천 이유를 한 줄 적어 주세요' : r.reason)
    }
    setBusy(true)
    try {
      const post = await boardService.addPost(board, {
        text,
        reason: cfg.hasReason ? reason : undefined,
        color: cfg.hasColor ? color : undefined,
        author: anon ? ANONYMOUS : myName,
      })
      onDone(post)
    } catch (e) {
      if (e instanceof BoardError) {
        setError(e.code === 'cooldown' ? `잠시 후에 다시 남겨 주세요 (${Math.ceil((e.retryAfterMs ?? 0) / 1000)}초)` : e.message)
      } else setError('올리지 못했어요. 잠시 후 다시 해 주세요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="compose"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <p className="privacy-note" role="note">
        🔒 학생 이름, 학교 이름, 연락처 같은 개인정보는 적지 마세요.
      </p>
      <label className="field">
        <span className="field-label">{cfg.topic}</span>
        <textarea
          className={`compose-input ${board}`}
          style={board === 'memo' ? { background: colorHex(color) } : undefined}
          value={text}
          rows={2}
          maxLength={POST_MAX}
          placeholder={cfg.placeholder}
          autoFocus
          onChange={(e) => {
            setText(noNewline(e.target.value))
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault() // 줄바꿈 대신 아무것도 안 함
          }}
        />
        <span className={`count ${len(text) >= POST_MAX ? 'full' : ''}`}>
          {len(text)}/{POST_MAX}
        </span>
      </label>
      {cfg.hasReason && (
        <label className="field">
          <span className="field-label">추천 이유 한 줄</span>
          <input
            className="compose-line"
            value={reason}
            maxLength={REASON_MAX}
            placeholder="예: 달아서 힘나요"
            onChange={(e) => {
              setReason(noNewline(e.target.value))
              setError(null)
            }}
          />
          <span className="count">
            {len(reason)}/{REASON_MAX}
          </span>
        </label>
      )}
      {cfg.hasColor && (
        <div className="swatches" role="radiogroup" aria-label="포스트잇 색">
          {MEMO_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={color === c.id}
              aria-label={c.name}
              className={`swatch ${color === c.id ? 'on' : ''}`}
              style={{ background: c.hex }}
              onClick={() => setColor(c.id)}
            />
          ))}
        </div>
      )}
      <label className="anon">
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
        이름 대신 '{ANONYMOUS}'으로 보이기 <span className="anon-name">(지금 이름: {myName})</span>
      </label>
      {error && (
        <p className="compose-error" role="alert">
          {error}
        </p>
      )}
      {cooldown > 0 && !error && <p className="compose-wait">잠시 후에 다시 남겨 주세요 · {Math.ceil(cooldown / 1000)}초</p>}
      <div className="compose-buttons">
        <button type="button" className="dialog-btn" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="dialog-btn primary" disabled={busy || cooldown > 0}>
          {busy ? '붙이는 중…' : '붙이기'}
        </button>
      </div>
    </form>
  )
}

export function BoardPanel({ board, myName, onClose }: Props) {
  const cfg = BOARDS[board]
  const [sort, setSort] = useState<SortMode>('latest')
  const [view, setView] = useState<'list' | 'compose'>('list')
  const [fresh, setFresh] = useState<string | null>(null)
  const [stamp, setStamp] = useState(false)
  const { posts, setPosts, loading, error, reload } = useBoard(board, sort)
  const { inset, viewH } = useKeyboardInset()
  const listRef = useRef<HTMLUListElement>(null)

  const react = async (p: Post) => {
    // 먼저 화면에 반영하고, 실패하면 되돌림
    const flip = (x: Post): Post => (x.id === p.id ? { ...x, reacted: !x.reacted, reactions: x.reactions + (x.reacted ? -1 : 1) } : x)
    setPosts((list) => list.map(flip))
    try {
      const r = await boardService.toggleReaction(board, p.id)
      setPosts((list) => list.map((x) => (x.id === p.id ? { ...x, ...r } : x)))
    } catch {
      setPosts((list) => list.map(flip))
    }
  }

  const [notice, setNotice] = useState<string | null>(null)
  const report = async (p: Post) => {
    try {
      await boardService.reportPost(board, p.id)
      setPosts((list) => list.filter((x) => x.id !== p.id))
      setNotice('신고가 접수됐어요. 이 글은 목록에서 빼 둘게요')
    } catch (e) {
      setNotice(e instanceof BoardError ? e.message : '신고하지 못했어요. 잠시 후 다시 해 주세요')
    }
    window.setTimeout(() => setNotice(null), 2600)
  }

  const remove = async (p: Post) => {
    try {
      await boardService.deleteMyPost(board, p.id)
      setPosts((list) => list.filter((x) => x.id !== p.id))
    } catch {
      void reload()
    }
  }

  const done = async (p: Post) => {
    setView('list')
    setFresh(p.id)
    setStamp(true)
    window.setTimeout(() => setStamp(false), 1400)
    if (sort !== 'latest') setSort('latest')
    else await reload()
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className={`board-sheet ${board}`}
        role="dialog"
        aria-label={cfg.title}
        style={{ bottom: inset, maxHeight: Math.min(viewH - 12, viewH * 0.86) }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <div>
            <h2>
              <span aria-hidden>{cfg.emoji}</span> {cfg.title}
            </h2>
            <p>{cfg.topic}</p>
          </div>
          <button className="dialog-x" aria-label={`${cfg.title} 닫기`} onClick={onClose}>
            ✕
          </button>
        </header>

        {view === 'list' ? (
          <>
            <div className="sort-toggle" role="tablist" aria-label="정렬">
              {(
                [
                  ['latest', '최신순'],
                  ['popular', '공감 많은 순'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={sort === id} className={sort === id ? 'on' : ''} onClick={() => setSort(id)}>
                  {label}
                </button>
              ))}
              <span className="post-count">{loading ? '' : `${posts.length}개`}</span>
            </div>
            <ul className={`post-list ${board}`} ref={listRef}>
              {loading && posts.length === 0 && (
                <li className="loading-row">
                  <span className="spinner" aria-hidden /> 불러오는 중…
                </li>
              )}
              {error && <li className="loading-row">{error}</li>}
              {posts.map((p) => (
                <PostCard key={p.id} post={p} board={board} highlight={p.id === fresh} onReact={react} onDelete={remove} onReport={report} />
              ))}
              {loading && posts.length > 0 && <li className="loading-row small">새로 불러오는 중…</li>}
            </ul>
            <footer className="sheet-foot">
              <button className="dialog-btn primary write-btn" onClick={() => setView('compose')}>
                ✏️ 글 남기기
              </button>
            </footer>
          </>
        ) : (
          <div className="compose-wrap">
            <Compose board={board} myName={myName} onDone={done} onCancel={() => setView('list')} />
          </div>
        )}
        {stamp && <div className="stamp">붙였어요!</div>}
        {notice && (
          <div className="sheet-notice" role="status">
            {notice}
          </div>
        )}
      </section>
    </div>
  )
}
