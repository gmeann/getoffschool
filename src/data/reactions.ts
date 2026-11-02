/**
 * 접속한 선생님끼리 주고받는 반응 (정해진 보기만, 자유 글자 없음).
 * 서버에는 번호만 보내고, 화면에서 이 목록으로 글자를 찾음.
 * 문구를 바꾸려면 이 파일만 고치면 됩니다. (순서를 바꾸면 이미 접속한 사람과 잠깐 어긋날 수 있으니 뒤에 추가하는 것을 권장)
 */

/** 머리 위 이모지: 번호 0~ */
export const REACTION_EMOJIS = ['😊', '☕', '💪', '👍', '🥲', '🙌', '🌙', '💖'] as const

/** 응원 한마디: 번호 100~ */
export const CHEERS = [
  '오늘도 수고하셨어요',
  '퇴근까지 힘내요',
  '푹 쉬세요',
  '저도 그래요',
  '반가워요',
  '좋은 저녁이에요',
  '내일도 화이팅',
  '잠깐 쉬어 가요',
] as const

export const CHEER_BASE = 100

/** 번호 → 화면 글자 (모르는 번호면 null) */
export function reactionText(id: number): string | null {
  if (id >= 0 && id < REACTION_EMOJIS.length) return REACTION_EMOJIS[id]
  const c = id - CHEER_BASE
  if (c >= 0 && c < CHEERS.length) return CHEERS[c]
  return null
}

/** 반응 말풍선이 보이는 시간 */
export const REACTION_MS = 2800
/** 반응을 연달아 보내는 간격 (도배 방지) */
export const REACTION_COOLDOWN_MS = 2500
/** 같은 선생님에게 다시 인사하기까지 */
export const GREET_COOLDOWN_MS = 8000
