import { useState } from 'react'
import { MIND_MAX, MIND_TEXT } from '../data/mindFloat'
import { hasPersonalInfo } from '../services/mindSafety'
import { useKeyboardInset } from '../hooks/useBoard'

/**
 * 마음 띄우기 입력창.
 * - 글은 이 컴포넌트의 상태(메모리)에만 있고, 닫으면 컴포넌트와 함께 사라짐
 * - 저장·전송·로그 없음, 브라우저 입력 기록 끔 (autocomplete/autocorrect/spellcheck off)
 */
type Props = { onSend: (text: string) => void; onClose: () => void }

export function MindCompose({ onSend, onClose }: Props) {
  const [text, setText] = useState('')
  const { inset, viewH } = useKeyboardInset()
  const trimmed = text.trim()
  const privacy = hasPersonalInfo(text)
  const count = [...text].length

  const send = () => {
    if (!trimmed) return
    const t = trimmed
    setText('')
    onSend(t)
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
            onChange={(e) => setText(e.target.value.replace(/[\r\n]+/g, ' '))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
          />
          <span className={`count ${count >= MIND_MAX ? 'full' : ''}`}>
            {count}/{MIND_MAX}
          </span>
        </div>
        {privacy && (
          <p className="mind-privacy" role="status">
            {MIND_TEXT.privacyHint}
          </p>
        )}
        <div className="compose-buttons">
          <button type="button" className="dialog-btn" onClick={onClose}>
            {MIND_TEXT.close}
          </button>
          <button type="button" className="dialog-btn primary" disabled={!trimmed} onClick={send} title={trimmed ? undefined : MIND_TEXT.emptyHint}>
            {MIND_TEXT.buttonEmoji} {MIND_TEXT.send}
          </button>
        </div>
      </section>
    </div>
  )
}
