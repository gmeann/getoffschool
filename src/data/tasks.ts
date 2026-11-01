/** 교실 "업무 날리기" 데이터: 서류 라벨, 날릴 때 문구, 날리는 방식 */

/** 하루에 쌓이는 서류 장수 */
export const DAILY_PAPERS = 20
/** 내가 직접 추가할 수 있는 서류 최대 장수 (하루) */
export const MAX_CUSTOM_PAPERS = 20
/** 내가 추가한 서류 이름 최대 글자 수 */
export const CUSTOM_NAME_MAX = 14
/** 직접 추가한 서류의 띠 색 (차례로 돌아가며) */
export const CUSTOM_COLORS = ['#f2a65a', '#4ab0d9', '#b07ad9', '#5bb07a', '#e05a5a', '#e0a030']
/** 서류 추가 창의 추천 이름 */
export const CUSTOM_SUGGESTIONS = ['내일 수업 준비', '학급 단톡 답장', '알림장 쓰기', '채점 마무리', '교실 정리', '공개수업 지도안']

export type TaskLabel = { name: string; color: string }

/** 서류 라벨 20개 (종이 윗부분 띠 색으로 구분) */
export const TASK_LABELS: TaskLabel[] = [
  { name: '공문', color: '#e05a5a' },
  { name: '생기부', color: '#4a86e0' },
  { name: '상담 기록', color: '#5bb07a' },
  { name: '업무 메신저', color: '#f2a65a' },
  { name: '학부모 상담', color: '#b07ad9' },
  { name: '방과후 서류', color: '#3fb5b0' },
  { name: '회의록', color: '#8a8d93' },
  { name: '연수 이수', color: '#e0a030' },
  { name: '가정통신문', color: '#ff8fb1' },
  { name: '출결 정리', color: '#6b8ec9' },
  { name: '수행평가 채점', color: '#d96b4a' },
  { name: '안전교육 보고', color: '#58a85b' },
  { name: '학년 협의록', color: '#9c7a5a' },
  { name: '예산 품의', color: '#c94a6b' },
  { name: '설문 결과 정리', color: '#4ab0d9' },
  { name: '체험학습 계획서', color: '#7ac94a' },
  { name: '나이스 입력', color: '#5a6bd9' },
  { name: '교육과정 평가', color: '#d9a04a' },
  { name: '물품 신청', color: '#a0a0a0' },
  { name: '현장학습 동의서', color: '#e07ab0' },
]

/** 한 장 날릴 때마다 무작위로 나오는 문구 15개 */
export const FLING_LINES = [
  '이건 내일의 내가 할 거야',
  '공문아, 안녕',
  '마감은 저 멀리 날아갔어요',
  '한 장 끝! 숨 한 번 쉬어요',
  '오늘은 여기까지만 할게요',
  '안녕히 가세요, 서류님',
  '책상이 조금 넓어졌어요',
  '잘 가! 다시 오지 마!',
  '어깨가 한결 가벼워졌어요',
  '이 정도면 충분히 잘했어요',
  '서류보다 내가 더 소중해요',
  '휴, 한 장 덜었다',
  '내일 일은 내일 걱정하기',
  '나 오늘 좀 멋졌다',
  '퇴근이 한 걸음 가까워졌어요',
]

export type FlingMethod = 'airplane' | 'shredder' | 'eraser' | 'balloon'
export type MethodChoice = FlingMethod | 'random'

export const METHODS: { id: MethodChoice; emoji: string; name: string; desc: string }[] = [
  { id: 'airplane', emoji: '✈️', name: '종이비행기', desc: '접어서 열린 창문 밖으로 슝' },
  { id: 'shredder', emoji: '🗂️', name: '파쇄기', desc: '드르륵, 가는 띠로 사르르' },
  { id: 'eraser', emoji: '🧽', name: '칠판지우개', desc: '칠판에 적고 슥슥 지우기' },
  { id: 'balloon', emoji: '🎈', name: '업무 풍선', desc: '부풀다가 팡! 색종이 펑펑' },
  { id: 'random', emoji: '🎲', name: '아무거나', desc: '날릴 때마다 무작위로' },
]

export const ALL_METHODS: FlingMethod[] = ['airplane', 'shredder', 'eraser', 'balloon']

/** 서류를 다 날렸을 때 받는 칭호 */
export const TITLE_DONE = '퇴근 준비 완료'
