import { useState } from 'react'
import { CUSTOM_NAME_MAX, CUSTOM_SUGGESTIONS, MAX_CUSTOM_PAPERS } from '../data/tasks'

type Props = { customCount: number; onAdd: (name: string) => string | null; onClose: () => void }

/** 내 서류 추가 창: 이름을 적으면 더미 맨 위에 올라감 */
export function AddPaper({ customCount, onAdd, onClose }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const left = MAX_CUSTOM_PAPERS - customCount

  const submit = (value = name) => {
    const err = onAdd(value)
    if (err) setError(err)
    else {
      setName('')
      setError(null)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="add-paper" role="dialog" aria-label="내 서류 추가" onClick={(e) => e.stopPropagation()}>
        <div className="book-head">
          <div>
            <h2>내 서류 올리기</h2>
            <p>오늘 마음에 걸리는 일을 적어 더미 맨 위에 올려요. 날려 버리면 끝!</p>
          </div>
          <button className="dialog-x" aria-label="창 닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <form
          className="add-form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            className="add-input"
            value={name}
            maxLength={CUSTOM_NAME_MAX}
            placeholder="예: 내일 수업 준비"
            aria-label="서류 이름"
            autoFocus
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
          />
          <button className="dialog-btn primary" type="submit" disabled={left <= 0}>
            올리기
          </button>
        </form>
        <div className="add-meta">
          <span className={error ? 'add-error' : ''}>{error ?? `${name.length}/${CUSTOM_NAME_MAX}자`}</span>
          <span>오늘 더 올릴 수 있는 서류 {Math.max(0, left)}장</span>
        </div>
        <div className="add-chips">
          {CUSTOM_SUGGESTIONS.map((s) => (
            <button key={s} className="add-chip" type="button" disabled={left <= 0} onClick={() => submit(s)}>
              + {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
