/** 교무실 NPC 3명: 위치, 옷차림, 대사 */
import type { Look } from '../components/CharacterModel'

export type NpcId = 'admin' | 'head' | 'vice'

export type NpcDef = {
  id: NpcId
  /** 머리 위 직책 이름표 */
  title: string
  look: Look
  x: number
  z: number
  yaw: number
  pose: 'stand' | 'sit'
  /** 내 캐릭터가 걸어가 서는 자리 */
  talkFrom: { x: number; z: number }
  lines: string[]
  greetings: string[]
  /** 간식을 줄 때 한마디 */
  giveLine: (snack: string) => string
}

/** 모든 NPC가 가끔 하는 공통 대사 */
export const COMMON_LINES = [
  '그거 아세요? 지금 숨 한 번 크게 쉬면 하루가 조금 가벼워져요.',
  '오늘 제일 잘한 일 하나만 떠올려 보세요. 분명 있어요.',
  '퇴근길엔 좋아하는 노래 한 곡 어때요?',
]

/** 오늘 이미 간식을 받은 경우 */
export const ALREADY_LINES = [
  '오늘은 이미 드렸죠? 내일 또 와요.',
  '간식은 하루에 하나! 내일 또 들러요.',
  '오늘 몫은 벌써 챙겨 가셨어요. 내일 또 봬요.',
]

export const NPCS: NpcDef[] = [
  {
    id: 'admin',
    title: '행정실 주무관님',
    look: {
      top: '#9ccc65', // 연두색 조끼
      sleeves: '#f7f4ec', // 셔츠 소매
      inner: '#f7f4ec',
      pants: '#5a5f73',
      shoes: '#3e3a44',
      hair: '#5a3d2b',
      skin: '#f6c7a1',
      badge: true,
      face: true,
    },
    x: 6.3,
    z: -4.6,
    yaw: 0,
    pose: 'stand',
    talkFrom: { x: 6.3, z: -3.3 },
    lines: [
      '오늘도 고생 많았어요. 이거 하나 드세요.',
      '복사기 종이 제가 채워 놨어요. 내일은 걱정 마세요.',
      '공문은 제가 잘 챙겨 둘게요. 오늘은 푹 쉬세요.',
      '선생님 얼굴 보니까 오늘 많이 바쁘셨구나 싶네요.',
      '행정실 문은 늘 열려 있어요. 언제든 놀러 오세요.',
      '오늘 택배 많이 왔던데, 학급 물품 받으셨어요?',
      '퇴근 시간 지났어요! 얼른 들어가세요 ㅎㅎ',
      '영수증 정리는 내일 같이 해요. 오늘은 여기까지!',
      '따뜻한 물 받아 가세요. 정수기 방금 청소했어요.',
      '선생님 반 아이들 인사 진짜 잘하더라고요.',
      '오늘 하루도 무사히 끝났네요. 박수 한번 짝짝!',
      '프린터 토너 바꿔 놨어요. 이제 진하게 잘 나와요.',
      '저도 오늘은 칼퇴할 거예요. 우리 같이 힘내요.',
      '바람이 차가워졌어요. 목도리 꼭 하고 가세요.',
      '무슨 일 있으면 행정실로 전화 주세요. 내선 0번이요!',
    ],
    greetings: ['안녕하세요! 오늘도 반가워요.', '어서 오세요~ 고생하셨어요.', '네, 안녕하세요! 꾸벅.'],
    giveLine: (s) => `이거 하나 드세요. ${s}예요! 몰래 드리는 거예요.`,
  },
  {
    id: 'head',
    title: '교무부장님',
    look: {
      top: '#2f3e66', // 남색 재킷
      sleeves: '#2f3e66',
      inner: '#dfe9f7',
      pants: '#2a2f45',
      shoes: '#2e2a30',
      hair: '#2a2a35',
      skin: '#f1bf96',
      glasses: true,
      face: true,
    },
    x: -5.8,
    z: -0.6,
    yaw: Math.PI / 2,
    pose: 'stand',
    talkFrom: { x: -5.8, z: 0.7 },
    lines: [
      '서류는 내일의 내가 할 거예요. 앉아서 차 한잔하세요.',
      '다음 주 회의는 짧게 끝내 볼게요. 약속해요.',
      '시간표 바꾸는 건 제가 해 볼게요. 걱정 마세요.',
      '오늘 수업 공개 정말 좋았다고 소문났어요.',
      '교육과정 계획서요? 아직 마감 아니에요. 숨 쉬세요.',
      '저도 처음엔 다 어려웠어요. 선생님 잘하고 계세요.',
      '안경 닦을 시간도 없었네요. 오늘 정말 바빴죠?',
      '메신저 알림은 잠깐 꺼 둬도 괜찮아요.',
      '회의록은 제가 정리할게요. 오늘은 퇴근!',
      '체육대회 준비는 천천히 같이 해요.',
      '선생님 반 게시판 보고 감탄했어요.',
      '학년 협의회 간식은 제가 쏠게요.',
      '업무 분장표 보고 놀라셨죠? 하나씩 하면 돼요.',
      '오늘 같은 날엔 일찍 자는 게 최고의 업무예요.',
      '잘하고 있다는 말, 오늘은 제가 먼저 할게요. 잘하고 있어요!',
    ],
    greetings: ['아, 선생님! 수고 많으셨어요.', '네~ 안녕하세요. 차 한잔하실래요?', '반가워요. 오늘도 고생했어요.'],
    giveLine: (s) => `서랍에 ${s} 있었어요. 회의 버틴 상이에요.`,
  },
  {
    id: 'vice',
    title: '교감선생님',
    look: {
      top: '#8a8d93', // 회색 정장
      sleeves: '#8a8d93',
      inner: '#ffffff',
      tie: '#8c2f39',
      pants: '#6e7177',
      shoes: '#2b2726',
      hair: '#b9b6b0',
      skin: '#f3c39c',
      face: true,
    },
    // 자기 책상 의자에 앉아 있음
    x: 0,
    z: -5.78,
    yaw: 0,
    pose: 'sit',
    talkFrom: { x: 0, z: -3.75 },
    lines: [
      '퇴근길에 조심히 가세요. 오늘도 수고 많았어요.',
      '선생님 덕분에 오늘 학교가 잘 돌아갔어요.',
      '복도에서 아이들이 선생님 얘기를 하더라고요. 좋은 얘기요.',
      '저녁은 꼭 챙겨 드세요. 그게 제일 중요해요.',
      '오늘 하루, 마음 힘든 일은 없었어요?',
      '교실 창문은 제가 순회하면서 닫을게요.',
      '저도 예전엔 이 시간까지 남아 있곤 했죠. 이제 들어가세요.',
      '내일 아침 조회는 짧게 할게요. 하하.',
      '선생님 건강이 먼저예요. 무리하지 마세요.',
      '학부모님께서 감사 인사 전해 달라고 하셨어요.',
      '운동장 노을 보셨어요? 오늘 유난히 예쁘더라고요.',
      '힘든 일은 혼자 두지 말고 꼭 말해 주세요.',
      '결재는 내일 아침에 올려도 괜찮아요.',
      '오늘 회의에서 낸 의견, 정말 좋았어요.',
      '선생님이 있어서 든든합니다. 조심히 가세요.',
    ],
    greetings: ['어이쿠, 선생님. 반갑습니다.', '네, 안녕하세요. 오늘도 고생 많으셨어요.', '허허, 인사 잘 받았어요.'],
    giveLine: (s) => `제 서랍 속 ${s}, 아껴 둔 거예요. 하나 드세요.`,
  },
]

export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n])) as Record<NpcId, NpcDef>

const lastLine: Partial<Record<NpcId, string>> = {}

/** 무작위 대사 (같은 NPC의 직전 대사와 겹치지 않게) */
export function pickNpcLine(id: NpcId): string {
  const pool = [...NPC_BY_ID[id].lines, ...COMMON_LINES]
  let line = pool[Math.floor(Math.random() * pool.length)]
  while (line === lastLine[id]) line = pool[Math.floor(Math.random() * pool.length)]
  lastLine[id] = line
  return line
}

export const pickFrom = (a: string[]) => a[Math.floor(Math.random() * a.length)]
