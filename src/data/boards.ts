/** 연구실 게시판 3종 설정과 시드 글 (각 15개) */

export type BoardId = 'memo' | 'fridge' | 'chalk'

export const POST_MAX = 60
export const REASON_MAX = 40
/** 글을 올린 뒤 다시 올릴 수 있을 때까지 (ms) */
export const POST_COOLDOWN_MS = 30_000
export const ANONYMOUS = '익명의 선생님'

/** 메모보드 포스트잇 색 4가지 */
export const MEMO_COLORS = [
  { id: 'yellow', name: '노랑', hex: '#ffe58a' },
  { id: 'pink', name: '분홍', hex: '#ffc1cf' },
  { id: 'mint', name: '민트', hex: '#bfeedd' },
  { id: 'sky', name: '하늘', hex: '#bfe0ff' },
] as const
export type MemoColor = (typeof MEMO_COLORS)[number]['id']

export type BoardConfig = {
  id: BoardId
  title: string
  topic: string
  emoji: string
  /** 반응 버튼 이름 */
  reaction: string
  reactionEmoji: string
  placeholder: string
  /** 냉장고: 추천 이유 한 줄 */
  hasReason?: boolean
  /** 메모보드: 포스트잇 색 고르기 */
  hasColor?: boolean
}

export const BOARDS: Record<BoardId, BoardConfig> = {
  memo: {
    id: 'memo',
    title: '메모보드',
    topic: '수업 아이디어와 꿀팁',
    emoji: '📌',
    reaction: '써볼게요',
    reactionEmoji: '✍️',
    placeholder: '우리 반에서 해 본 작은 꿀팁을 나눠 주세요',
    hasColor: true,
  },
  fridge: {
    id: 'fridge',
    title: '냉장고',
    topic: '간식, 선물, 맛집 추천',
    emoji: '🧊',
    reaction: '맛있겠다',
    reactionEmoji: '😋',
    placeholder: '추천하고 싶은 간식이나 선물, 맛집',
    hasReason: true,
  },
  chalk: {
    id: 'chalk',
    title: '칠판',
    topic: '오늘의 한마디 · 응원, 푸념, 오늘의 한 줄',
    emoji: '🖍️',
    reaction: '나도 그래요',
    reactionEmoji: '🤝',
    placeholder: '오늘의 한 줄을 남겨 주세요',
  },
}

export const BOARD_ORDER: BoardId[] = ['memo', 'fridge', 'chalk']

export type SeedPost = {
  text: string
  author: string
  reactions: number
  /** 지금보다 몇 시간 전에 쓴 글인지 */
  hoursAgo: number
  color?: MemoColor
  reason?: string
}

export const SEED_POSTS: Record<BoardId, SeedPost[]> = {
  memo: [
    { text: "쉬는 시간 종 치기 1분 전에 '3초 조용' 게임 해 보세요", author: '느긋한 출석부', reactions: 38, hoursAgo: 30, color: 'yellow' },
    { text: '알림장 대신 오늘의 칭찬 한 줄 쓰기 해 보니 좋았어요', author: ANONYMOUS, reactions: 27, hoursAgo: 5, color: 'pink' },
    { text: '모둠 활동 전에 역할 카드 나눠 주면 다툼이 확 줄어요', author: '졸린 분필', reactions: 22, hoursAgo: 52, color: 'mint' },
    { text: '발표 순서는 제비뽑기 막대로! 아이들이 두근두근해해요', author: ANONYMOUS, reactions: 15, hoursAgo: 9, color: 'sky' },
    { text: "받아쓰기 틀린 단어는 '단어 탐정' 놀이로 다시 보면 재밌어해요", author: '말랑한 지우개', reactions: 11, hoursAgo: 75, color: 'yellow' },
    { text: '아침 활동으로 그림일기 3줄 쓰기, 마음 날씨 알기 좋아요', author: '포근한 무릎담요', reactions: 19, hoursAgo: 28, color: 'mint' },
    { text: '정리 시간에 노래 한 곡 틀고 끝나기 전까지 정리하기 성공률 높아요', author: ANONYMOUS, reactions: 33, hoursAgo: 99, color: 'pink' },
    { text: '수학 시간 시작은 오늘의 숫자 퀴즈 하나로 열어요', author: '동그란 칭찬도장', reactions: 9, hoursAgo: 3, color: 'sky' },
    { text: '줄 설 때 오늘의 짝꿍 노래 부르면 금방 서요', author: ANONYMOUS, reactions: 6, hoursAgo: 14, color: 'yellow' },
    { text: '학급 회의 안건함 만들어 두니 아이들 의견이 쏟아져요', author: '반짝이는 스티커', reactions: 14, hoursAgo: 120, color: 'mint' },
    { text: '책 읽어 주기 5분, 오후 집중이 확실히 달라요', author: '천천히 걷는 실내화', reactions: 25, hoursAgo: 46, color: 'pink' },
    { text: '칠판 구석에 오늘의 질문 하나 써 두면 쉬는 시간 대화가 생겨요', author: ANONYMOUS, reactions: 17, hoursAgo: 21, color: 'sky' },
    { text: '손 신호 정하기: 주먹은 조용히, 보자기는 도움 필요해요', author: '쉬는 시간 종소리', reactions: 12, hoursAgo: 63, color: 'yellow' },
    { text: '칭찬 스티커 대신 학급 전체 칭찬 구슬 모으기, 협동심 쑥쑥', author: ANONYMOUS, reactions: 21, hoursAgo: 7, color: 'mint' },
    { text: '하교 전 1분 하루 돌아보기, 엄지로 오늘 기분 표시해요', author: '노을 보는 칠판', reactions: 4, hoursAgo: 1, color: 'pink' },
  ],
  fridge: [
    { text: '교무실 간식으로 약과 추천해요', reason: '달아서 힘나요', author: ANONYMOUS, reactions: 31, hoursAgo: 12 },
    { text: '퇴근길 편의점 따뜻한 율무차', reason: '위로 그 자체', author: '따뜻한 믹스커피', reactions: 40, hoursAgo: 26 },
    { text: '학년 협의회 간식은 미니 붕어빵', reason: '나눠 먹기 좋고 다들 웃어요', author: ANONYMOUS, reactions: 18, hoursAgo: 4 },
    { text: '동학년 선생님 생일 선물로 핸드크림', reason: '분필 가루에 지친 손을 위해', author: '포근한 무릎담요', reactions: 23, hoursAgo: 70 },
    { text: '학교 앞 분식집 떡볶이', reason: '방과후 회의 전에 딱이에요', author: ANONYMOUS, reactions: 15, hoursAgo: 33 },
    { text: '귤 한 박스 교무실에 두기', reason: '오가며 하나씩, 비타민 충전', author: '식어가는 보리차', reactions: 27, hoursAgo: 8 },
    { text: '목캔디는 서랍 필수템', reason: '수업 많은 날 목을 지켜 줘요', author: ANONYMOUS, reactions: 35, hoursAgo: 49 },
    { text: '주말 브런치로 프렌치토스트 만들기', reason: '나를 위한 작은 잔치', author: '오늘도 수고한 연필', reactions: 9, hoursAgo: 90 },
    { text: '찹쌀떡 간식 추천해요', reason: '든든해서 오후 수업이 버텨져요', author: ANONYMOUS, reactions: 12, hoursAgo: 17 },
    { text: '퇴근길 국밥 한 그릇', reason: '하루를 따뜻하게 마무리', author: '느릿한 급식판', reactions: 29, hoursAgo: 55 },
    { text: '선물로는 향 좋은 드립백 커피', reason: '교무실 아침이 향기로워져요', author: ANONYMOUS, reactions: 20, hoursAgo: 2 },
    { text: '수업 공개 날엔 초콜릿 한 조각', reason: '떨리는 마음에 당 충전', author: '살랑이는 커튼', reactions: 16, hoursAgo: 38 },
    { text: '겨울엔 군고구마 트럭을 찾아요', reason: '호호 불어 먹는 행복', author: ANONYMOUS, reactions: 24, hoursAgo: 110 },
    { text: '동료 선생님께 손편지와 사탕', reason: '작은 마음이 오래 남아요', author: '한숨 돌린 알림장', reactions: 7, hoursAgo: 6 },
    { text: '유자차 큰 병 하나 교무실에', reason: '목 아픈 날 모두의 구원', author: ANONYMOUS, reactions: 3, hoursAgo: 0.5 },
  ],
  chalk: [
    { text: '이번 주 월요일이 두 번 온 것 같아요', author: ANONYMOUS, reactions: 39, hoursAgo: 20 },
    { text: '오늘은 아이들이 정말 예뻤어요', author: '빈 교실의 햇살', reactions: 34, hoursAgo: 3 },
    { text: '공문이 저를 찾아다니는 것 같아요', author: ANONYMOUS, reactions: 28, hoursAgo: 44 },
    { text: '선생님 사랑해요 한마디에 하루가 녹았어요', author: '꾸벅이는 교무수첩', reactions: 36, hoursAgo: 9 },
    { text: '내일은 칼퇴할 거예요. 진짜로요', author: ANONYMOUS, reactions: 25, hoursAgo: 15 },
    { text: '목이 쉬었지만 마음은 맑음', author: '기지개 켜는 의자', reactions: 13, hoursAgo: 66 },
    { text: '다들 오늘도 무사히 버티셨어요. 대단해요', author: ANONYMOUS, reactions: 31, hoursAgo: 1 },
    { text: '급식에 제가 좋아하는 반찬 나온 날', author: '퇴근 앞둔 구름', reactions: 10, hoursAgo: 27 },
    { text: '실수해도 괜찮아, 나한테도 해 주는 말', author: ANONYMOUS, reactions: 22, hoursAgo: 80 },
    { text: '비 오는 날 교실은 왜 이렇게 시끄러울까요', author: '조용한 슬리퍼', reactions: 17, hoursAgo: 33 },
    { text: '오늘의 한 줄: 그래도 웃었다', author: ANONYMOUS, reactions: 19, hoursAgo: 5 },
    { text: '학부모 상담 끝! 저 자신 칭찬해요', author: '오늘도 수고한 연필', reactions: 14, hoursAgo: 58 },
    { text: '금요일 냄새가 나기 시작했어요', author: ANONYMOUS, reactions: 8, hoursAgo: 2 },
    { text: '아이 한 명이 처음 손 들고 발표했어요', author: '동그란 칭찬도장', reactions: 27, hoursAgo: 100 },
    { text: '퇴근길 노을 보고 마음이 풀렸어요', author: ANONYMOUS, reactions: 5, hoursAgo: 0.3 },
  ],
}
