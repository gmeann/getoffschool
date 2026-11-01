import { useState } from 'react'
import { MIND_MAX, MIND_TEXT } from '../data/mindFloat'
import { hasPersonalInfo } from '../services/mindSafety'
import { hasBanned } from '../services/moderation'
import { useKeyboardInset } from '../hooks/useBoard'

/**
 * 마음 띄우기 입력창.
 * - 글은 이 컴포넌트의 상태(메모리)에만 있고, 닫으면 컴포넌트와 함께 사라짐
 * - "나누기"가 꺼져 있으면 저장·전송·로그 없음 (5.5단계 그대로), 브라우저 입력 기록 끔
 * - "나누기"를 켰을 때만 부르는 쪽(App)이 heartService 로 보냄
 */
type Props = {
  onSend: (text: string, share: boolean) => void
  onClose: () => void
  /** 나누기 가능 여부 확인 (남은 대기 시간 ms, 혼자 보는 모드면 -1) */
  shareCheck: () => number
}

export function MindCompose({ onSend, onClose, shareCheck }: Props) {
  const [text, setText] = useState('')
  const [share, setShare] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const { inset, viewH } = useKeyboardInset()
  const trimmed = text.trim()
  const privacy = hasPersonalInfo(text)
  const count = [...text].length

  const send = () => {
    if (!trimmed) return
    if (share) {
      // 나눌 때는 개인정보·금지어를 "차단" (혼자 띄우기는 그대로 가능)
      if (hasPersonalInfo(trimmed) || hasBanned(trimmed)) return setShareError(MIND_TEXT.shareBlocked)
      const wait = shareCheck()
      if (wait < 0) return setShareError(MIND_TEXT.shareOffline)
      if (wait > 0) return setShareError(MIND_TEXT.shareCooldown(Math.ceil(wait / 1000)))
    }
    const t = trimmed
    setText('')
    onSend(t, share)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="mind-sheet"
        role="dialog"
        aria-label={MIND_TEXT.title}
        style={{ bottom: inset, maxHeight: viewH - 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <h2>
            <span aria-hidden>{MIND_TEXT.buttonEmoji}</span> {MIND_TEXT.title}
          </h2>
          <button className="dialog-x" aria-label={MIND_TEXT.close} onClick={onClose}>
            ✕
          </button>
        </header>
        <p className="mind-notice" role="note">
          {MIND_TEXT.notice}
        </p>
        <div className="field">
          <textarea
            className="mind-input"
            value={text}
            rows={3}
            maxLength={MIND_MAX}
            placeholder={MIND_TEXT.placeholder}
            aria-label={MIND_TEXT.placeholder}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            onChange={(e) => {
              setText(e.target.value.replace(/[\r\n]+/g, ' '))
              setShareError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
          />
          <span className={`count ${count >= MIND_MAX ? 'full' : ''}`}>
            {count}/{MIND_MAX}
          </span>
        </div>
        {privacy && !share && (
          <p className="mind-privacy" role="status">
            {MIND_TEXT.privacyHint}
          </p>
        )}
        {share && (
          <p className="mind-share-notice" role="note">
            {MIND_TEXT.shareNotice}
          </p>
        )}
        <label className="anon mind-share">
          <input
            type="checkbox"
            checked={share}
            onChange={(e) => {
              setShare(e.target.checked)
              setShareError(null)
            }}
          />
          {MIND_TEXT.shareLabel}
        </label>
        {shareError && (
          <p className="compose-error" role="alert">
            {shareError}
          </p>
        )}
        <div className="compose-buttons">
          <button type="button" className="dialog-btn" onClick={onClose}>
            {MIND_TEXT.close}
          </button>
          <button type="button" className="dialog-btn primary" disabled={!trimmed} onClick={send} title={trimmed ? undefined : MIND_TEXT.emptyHint}>
            {MIND_TEXT.buttonEmoji} {share ? MIND_TEXT.sendShare : MIND_TEXT.send}
          </button>
        </div>
      </section>
    </div>
  )
}
