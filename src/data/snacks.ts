/** 간식 20종. 희귀도: 흔함 70%, 특별함 25%, 귀함 5% */

export type Rarity = 'common' | 'special' | 'rare'

export type Snack = {
  id: string
  name: string
  desc: string
  /** 아이콘 색 (이모지가 없으면 이 색의 도형으로 표시) */
  color: string
  emoji?: string
  rarity: Rarity
}

export const RARITY_LABEL: Record<Rarity, string> = { common: '흔함', special: '특별함', rare: '귀함' }
export const RARITY_CHANCE: Record<Rarity, number> = { common: 0.7, special: 0.25, rare: 0.05 }

export const SNACKS: Snack[] = [
  // 흔함 12
  { id: 'tangerine', name: '귤', emoji: '🍊', color: '#f59b2b', rarity: 'common', desc: '껍질 까는 소리가 위로가 되는 간식' },
  { id: 'mixcoffee', name: '믹스커피', emoji: '☕', color: '#a8743f', rarity: 'common', desc: '종이컵 하나에 담긴 교무실의 온기' },
  { id: 'ppeong', name: '뻥튀기', color: '#f3e1b5', rarity: 'common', desc: '바삭 소리에 스트레스도 같이 부서져요' },
  { id: 'candy', name: '사탕', emoji: '🍬', color: '#ff8fb1', rarity: 'common', desc: '주머니 속 작은 비상식량' },
  { id: 'jelly', name: '젤리', color: '#ff6b6b', rarity: 'common', desc: '말랑말랑, 마음도 말랑해지는 맛' },
  { id: 'barley', name: '보리차', emoji: '🍵', color: '#c9a36a', rarity: 'common', desc: '구수한 향이 하루를 정리해 줘요' },
  { id: 'cookie', name: '쿠키', emoji: '🍪', color: '#d39b5a', rarity: 'common', desc: '아이들이 몰래 나눠 준 그 맛' },
  { id: 'eggsnack', name: '계란과자', color: '#f2c86b', rarity: 'common', desc: '한 봉지 다 먹게 되는 신기한 과자' },
  { id: 'chocopie', name: '초코파이', color: '#7a4a2e', rarity: 'common', desc: '정이 담긴 동그란 위로' },
  { id: 'gjuice', name: '감귤 주스', emoji: '🧃', color: '#ffb347', rarity: 'common', desc: '상큼함 한 모금, 피로는 반 모금' },
  { id: 'yulmu', name: '율무차', color: '#e8d9b8', rarity: 'common', desc: '고소하고 든든한 한 잔' },
  { id: 'walnut', name: '호두과자', color: '#b5793c', rarity: 'common', desc: '휴게소 추억이 떠오르는 한 알' },
  // 특별함 6
  { id: 'yakgwa', name: '약과', color: '#b8662c', rarity: 'special', desc: '꿀 머금은 전통의 달콤함' },
  { id: 'sikhye', name: '식혜', color: '#efe3c2', rarity: 'special', desc: '밥알 동동, 시원하게 내려가는 단맛' },
  { id: 'yuja', name: '유자차', emoji: '🍋', color: '#ffd23f', rarity: 'special', desc: '목이 칼칼한 날 최고의 처방' },
  { id: 'bungeo', name: '붕어빵', emoji: '🐟', color: '#d98c3f', rarity: 'special', desc: '꼬리부터 먹을까, 머리부터 먹을까' },
  { id: 'goguma', name: '군고구마', emoji: '🍠', color: '#a2453c', rarity: 'special', desc: '호호 불어 먹는 겨울의 맛' },
  { id: 'madeleine', name: '마들렌', color: '#e7b45c', rarity: 'special', desc: '버터 향이 기억을 깨우는 작은 빵' },
  // 귀함 2
  { id: 'ssanghwa', name: '쌍화차', color: '#6b3b2a', rarity: 'rare', desc: '노른자 동동, 교감선생님 서랍 속 비밀' },
  { id: 'dalgona', name: '달고나', color: '#e0a030', rarity: 'rare', desc: '모양 그대로 떼어 내면 오늘의 행운' },
]

export const SNACK_BY_ID = Object.fromEntries(SNACKS.map((s) => [s.id, s])) as Record<string, Snack>

/** 희귀도 확률로 하나 뽑기 */
export function rollSnack(r = Math.random()): Snack {
  const rarity: Rarity = r < RARITY_CHANCE.common ? 'common' : r < RARITY_CHANCE.common + RARITY_CHANCE.special ? 'special' : 'rare'
  const pool = SNACKS.filter((s) => s.rarity === rarity)
  return pool[Math.floor(Math.random() * pool.length)]
}
