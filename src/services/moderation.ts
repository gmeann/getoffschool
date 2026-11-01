/** 글 검사: 빈 글, 길이, 줄바꿈, 금지어·개인정보 형식. UI와 boardService 가 함께 사용 */
import { BANNED_PATTERNS, BANNED_WORDS } from '../data/bannedWords'

export type CheckResult = { ok: true; text: string } | { ok: false; reason: string }

export const BANNED_MESSAGE = '이 표현은 올릴 수 없어요. 다른 말로 바꿔 보세요'

/** 줄바꿈은 공백으로 바꾸고 앞뒤 공백 정리 */
export function cleanText(raw: string): string {
  return raw.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

export function hasBanned(text: string): boolean {
  const squashed = text.toLowerCase().replace(/[\s.,_\-*~!?@#$%^&()[\]{}'"`/\\|+=<>:;0-9]+/g, '')
  if (BANNED_WORDS.some((w) => squashed.includes(w.toLowerCase()))) return true
  return BANNED_PATTERNS.some((p) => p.re.test(text))
}

export function checkText(raw: string, max: number, { allowEmpty = false } = {}): CheckResult {
  const text = cleanText(raw)
  if (!text) return allowEmpty ? { ok: true, text } : { ok: false, reason: '내용을 적어 주세요' }
  if ([...text].length > max) return { ok: false, reason: `${max}자까지 쓸 수 있어요` }
  if (hasBanned(text)) return { ok: false, reason: BANNED_MESSAGE }
  return { ok: true, text }
}
