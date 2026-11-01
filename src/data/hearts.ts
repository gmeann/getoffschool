/** 마음 나누기 (하늘의 구름) 설정과 시드 */

export const HEART_MAX = 100
/** 하늘에 띄우는 구름 최대 개수 (폰 성능) */
export const SKY_HEARTS_MAX = 12

export type HeartKind = 'pat' | 'thanks' | 'together'
export const HEART_REACTIONS: { kind: HeartKind; emoji: string; label: string }[] = [
  { kind: 'pat', emoji: '🤲', label: '토닥토닥' },
  { kind: 'thanks', emoji: '🙏', label: '수고했어요' },
  { kind: 'together', emoji: '🫶', label: '같이 있어요' },
]

/** 진짜 나눈 글이 적을 때 하늘이 비어 보이지 않게 채우는 시드 (DB 에 넣지 않음) */
export const SEED_HEARTS: { text: string; nick: string; hoursAgo: number; pat: number; thanks: number; together: number }[] = [
  { text: '오늘 수업이 생각대로 안 돼서 속상했어요. 그래도 내일은 또 해 볼래요.', nick: '느긋한 출석부', hoursAgo: 3, pat: 12, thanks: 8, together: 15 },
  { text: '학부모 전화 받고 한참 멍했어요. 여기 털어놓고 갑니다.', nick: '익명의 선생님', hoursAgo: 6, pat: 21, thanks: 5, together: 18 },
  { text: '아이 한 명이 고맙다고 편지를 줬어요. 그 힘으로 버텨요.', nick: '빈 교실의 햇살', hoursAgo: 9, pat: 4, thanks: 19, together: 7 },
  { text: '업무가 끝이 없네요. 그래도 퇴근길 노을은 예뻤어요.', nick: '졸린 분필', hoursAgo: 14, pat: 9, thanks: 11, together: 13 },
  { text: '혼자만 힘든 줄 알았는데 다들 비슷하구나 싶어서 위로돼요.', nick: '익명의 선생님', hoursAgo: 22, pat: 6, thanks: 4, together: 24 },
  { text: '오늘은 그냥 아무 말 없이 쉬고 싶어요.', nick: '조용한 슬리퍼', hoursAgo: 30, pat: 17, thanks: 3, together: 10 },
]
