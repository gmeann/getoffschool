import { useEffect, useState } from 'react'
import { adminService, boardLabel, type AdminState, type AdminStats, type ReportedItem } from '../services/adminService'

/** 설정 창 안의 관리자 영역: 로그인 상태에 따라 로그인 / 관리자 화면 열기 */
export function AdminSection({ onOpen }: { onOpen: () => void }) {
  const [state, setState] = useState<AdminState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    void adminService.state().then(setState)
  }, [])

  return (
    <section className="set-section admin">
      <h3>🛠️ 관리자</h3>
      {!state && <p className="set-hint">확인하는 중…</p>}
      {state?.kind === 'offline' && <p className="set-hint">지금은 서버에 연결되지 않아 관리자 모드를 쓸 수 없어요.</p>}
      {state?.kind === 'signed-out' && (
        <button
          className="dialog-btn primary"
          onClick={() => adminService.signIn().catch(() => setError('로그인하지 못했어요. Firebase 콘솔에서 Google 로그인이 켜져 있는지 확인해 주세요'))}
        >
          Google 계정으로 관리자 로그인
        </button>
      )}
      {state?.kind === 'not-admin' && (
        <>
          <p className="set-hint">
            {state.email} 계정은 아직 관리자로 등록되지 않았어요. Firebase 콘솔 → Firestore 에서 <code>admins</code> 컬렉션에 아래 ID 로 문서를 하나
            만들어 주세요 (필드는 아무거나).
          </p>
          <div className="set-row">
            <code className="uid">{state.uid}</code>
            <button
              className="mini"
              onClick={() => {
                void navigator.clipboard?.writeText(state.uid)
                setCopied(true)
              }}
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <button className="dialog-btn" onClick={() => void adminService.signOut()}>
            로그아웃
          </button>
        </>
      )}
      {state?.kind === 'admin' && (
        <>
          <p className="set-hint">{state.email} (관리자)</p>
          <div className="compose-buttons">
            <button className="dialog-btn primary" onClick={onOpen}>
              관리자 화면 열기
            </button>
            <button className="dialog-btn" onClick={() => void adminService.signOut()}>
              로그아웃
            </button>
          </div>
        </>
      )}
      {error && <p className="compose-error">{error}</p>}
    </section>
  )
}

function timeText(t: number) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 관리자 화면: 신고된 글 (되살리기·삭제), 오늘 통계 */
export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'reported' | 'stats'>('reported')
  const [items, setItems] = useState<ReportedItem[] | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ask, setAsk] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    if (tab === 'reported') adminService.reported().then(setItems).catch(() => setError('불러오지 못했어요. 관리자 권한과 규칙 배포를 확인해 주세요'))
    else adminService.stats().then(setStats).catch(() => setError('통계를 불러오지 못했어요'))
  }, [tab])

  const act = async (it: ReportedItem, kind: 'restore' | 'remove') => {
    try {
      if (kind === 'restore') await adminService.restore(it)
      else await adminService.remove(it)
      setItems((l) => (l ?? []).filter((x) => x.id !== it.id))
      setAsk(null)
    } catch {
      setError('처리하지 못했어요')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="admin-panel" role="dialog" aria-label="관리자 화면" onClick={(e) => e.stopPropagation()}>
        <div className="book-head">
          <div>
            <h2>🛠️ 관리자</h2>
            <p>신고된 글을 확인하고 되살리거나 지울 수 있어요</p>
          </div>
          <button className="dialog-x" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sort-toggle" role="tablist">
          <button role="tab" aria-selected={tab === 'reported'} className={tab === 'reported' ? 'on' : ''} onClick={() => setTab('reported')}>
            신고된 글
          </button>
          <button role="tab" aria-selected={tab === 'stats'} className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>
            오늘 통계
          </button>
        </div>
        {error && <p className="compose-error">{error}</p>}
        {tab === 'reported' && (
          <ul className="admin-list">
            {!items && !error && (
              <li className="loading-row">
                <span className="spinner" /> 불러오는 중…
              </li>
            )}
            {items?.length === 0 && <li className="loading-row">신고된 글이 없어요 🌿</li>}
            {items?.map((it) => (
              <li key={it.kind + it.id} className={`admin-item ${it.hidden ? 'hidden' : ''}`}>
                <div className="admin-meta">
                  <span className="admin-board">{boardLabel(it.board)}</span>
                  <span>신고 {it.reportCount}</span>
                  {it.hidden && <span className="admin-hidden">숨김</span>}
                  <span className="admin-time">
                    {it.nick} · {timeText(it.createdAt)}
                  </span>
                </div>
                <p className="admin-text">{it.text}</p>
                <div className="post-actions">
                  {ask === it.id ? (
                    <span className="confirm">
                      정말 지울까요?
                      <button className="mini danger" onClick={() => act(it, 'remove')}>
                        지우기
                      </button>
                      <button className="mini" onClick={() => setAsk(null)}>
                        취소
                      </button>
                    </span>
                  ) : (
                    <>
                      <button className="mini" onClick={() => act(it, 'restore')}>
                        되살리기
                      </button>
                      <button className="mini danger" onClick={() => setAsk(it.id)}>
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {tab === 'stats' && stats && (
          <div className="admin-stats">
            {(
              [
                ['오늘 방문한 선생님', stats.visitors, '명'],
                ['오늘 날린 업무', stats.flung, '장'],
                ['오늘 운동장 바퀴', stats.laps, '바퀴'],
                ['오늘 올라온 게시판 글', stats.postsToday, '개'],
                ['오늘 나눈 마음', stats.heartsToday, '개'],
                ['신고된 글 (전체)', stats.reported, '개'],
              ] as const
            ).map(([label, v, unit]) => (
              <div key={label} className="stat-card">
                <span className="stat-label">{label}</span>
                <strong>
                  {v}
                  <small>{unit}</small>
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
