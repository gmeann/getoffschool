/** 마음 띄우기 글 검사: 개인정보 형식 안내, 위기 신호 감지. 결과는 기록·전송하지 않음 */
import { BANNED_PATTERNS } from '../data/bannedWords'
import { CRISIS_PATTERNS, CRISIS_WORDS } from '../data/crisisWords'

/** 전화번호·이메일·주민번호 형식이 보이는지 (5단계 필터 정규식 재사용) */
export function hasPersonalInfo(text: string): boolean {
  return BANNED_PATTERNS.some((p) => p.re.test(text))
}

export function hasCrisisSignal(text: string): boolean {
  const squashed = text.replace(/[\s.,~!?…\-_'"]+/g, '')
  return CRISIS_WORDS.some((w) => squashed.includes(w)) || CRISIS_PATTERNS.some((re) => re.test(text))
}
