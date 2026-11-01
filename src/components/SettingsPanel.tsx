import { useState } from 'react'
import type { Settings } from '../hooks/settingsStore'
import { ANONYMOUS } from '../data/boards'

type Props = {
  settings: Settings
  name: string
  onChange: (patch: Partial<Settings>) => void
  onReroll: () => void
  onClearData: () => void
  onClose: () => void
  /** 관리자 영역 (?admin=1 일 때만 보임) */
  admin?: React.ReactNode
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="set-row">
      <span className="set-text">
        <span className="set-label">{label}</span>
        {hint && <span className="set-hint">{hint}</span>}
      </span>
      <input type="checkbox" className="switch" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Volume({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <label className={`set-row volume ${disabled ? 'off' : ''}`}>
      <span className="set-label small">{label}</span>
      <input type="range" min={0} max={1} step={0.05} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  )
}

/** 설정 창: 소리, 이름, 익명 기본값, 저사양 모드, 기록 지우기, 개인정보 안내 (+ 관리자) */
export function SettingsPanel({ settings: s, name, onChange, onReroll, onClearData, onClose, admin }: Props) {
  const [askClear, setAskClear] = useState(false)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-panel" role="dialog" aria-label="설정" onClick={(e) => e.stopPropagation()}>
        <div className="book-head">
          <div>
            <h2>설정</h2>
            <p>이 기기에만 저장돼요</p>
          </div>
          <button className="dialog-x" aria-label="설정 닫기" onClick={onClose}>
            ✕
          </button>
        </div>

        <section className="set-section">
          <h3>🔊 소리</h3>
          <Toggle label="배경음악" hint="잔잔한 앰비언트와 바람·풀벌레 소리" checked={s.bgm} onChange={(v) => onChange({ bgm: v })} />
          <Volume label="배경음악 크기" value={s.bgmVolume} disabled={!s.bgm} onChange={(v) => onChange({ bgmVolume: v })} />
          <Toggle label="효과음" hint="종이비행기, 풍선, 간식 받기 같은 소리" checked={s.sfx} onChange={(v) => onChange({ sfx: v })} />
          <Volume label="효과음 크기" value={s.sfxVolume} disabled={!s.sfx} onChange={(v) => onChange({ sfxVolume: v })} />
        </section>

        <section className="set-section">
          <h3>🙂 나</h3>
          <div className="set-row">
            <span className="set-text">
              <span className="set-label">지금 이름</span>
              <span className="set-hint">{name}</span>
            </span>
            <button className="mini big" onClick={onReroll}>
              🎲 다시 뽑기
            </button>
          </div>
          <Toggle
            label={`글·마음을 나눌 때 기본으로 '${ANONYMOUS}'`}
            hint="켜 두면 이름 대신 익명으로 보여요"
            checked={s.anonDefault}
            onChange={(v) => onChange({ anonDefault: v })}
          />
        </section>

        <section className="set-section">
          <h3>📱 화면</h3>
          <Toggle label="저사양 모드" hint="해상도를 낮추고 산책하는 선생님 수를 줄여서 오래된 폰도 부드럽게" checked={s.lowSpec} onChange={(v) => onChange({ lowSpec: v })} />
        </section>

        <section className="set-section">
          <h3>🔒 개인정보 안내</h3>
          <ul className="privacy-list">
            <li>로그인 없이 익명으로 들어와요. 이름은 접속할 때마다 무작위로 정해져요.</li>
            <li>
              <strong>마음 띄우기(혼자 털기)</strong>로 쓴 글은 어디에도 저장되지 않아요. "나누기"를 켰을 때만 다른 선생님들이 볼 수 있게 올라가요.
            </li>
            <li>연구실 게시판 글과 나눈 마음은 익명으로 공유되고, 내 글은 언제든 지울 수 있어요.</li>
            <li>간식 도감, 칭호, 바퀴 수, 설정 같은 기록은 이 기기에만 저장돼요.</li>
            <li>학생·학부모·동료 이름, 학교 이름, 연락처는 적지 말아 주세요.</li>
          </ul>
        </section>

        <section className="set-section">
          <h3>🧹 기록</h3>
          {askClear ? (
            <div className="set-row">
              <span className="set-text">
                <span className="set-label">정말 지울까요?</span>
                <span className="set-hint">도감·칭호·바퀴 수·서류 더미 등 이 기기의 기록이 모두 지워져요 (설정은 남아요)</span>
              </span>
              <span className="confirm">
                <button className="mini danger" onClick={onClearData}>
                  지우기
                </button>
                <button className="mini" onClick={() => setAskClear(false)}>
                  취소
                </button>
              </span>
            </div>
          ) : (
            <button className="dialog-btn" onClick={() => setAskClear(true)}>
              이 기기 기록 지우기
            </button>
          )}
        </section>

        {admin}
      </div>
    </div>
  )
}
