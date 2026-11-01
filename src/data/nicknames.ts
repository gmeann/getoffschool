/** 접속할 때마다 무작위로 붙는 이름표 목록 ("나 | 이름" 형식으로 표시) */
export const NICKNAMES = [
  '퇴근 앞둔 구름',
  '느긋한 출석부',
  '졸린 분필',
  '따뜻한 믹스커피',
  '조용한 슬리퍼',
  '말랑한 지우개',
  '쉬는 시간 종소리',
  '노을 보는 칠판',
  '꾸벅이는 교무수첩',
  '포근한 무릎담요',
  '한숨 돌린 알림장',
  '천천히 걷는 실내화',
  '빈 교실의 햇살',
  '동그란 칭찬도장',
  '식어가는 보리차',
  '반짝이는 스티커',
  '느릿한 급식판',
  '기지개 켜는 의자',
  '살랑이는 커튼',
  '오늘도 수고한 연필',
] as const

export function pickRandomNickname(): string {
  return NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)]
}
