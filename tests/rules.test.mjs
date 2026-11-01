/**
 * Firestore 보안 규칙 테스트 (에뮬레이터에서 실행)
 * 실행: npm run test:rules
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import {
  doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, writeBatch, collection, query, where, limit,
  serverTimestamp, increment, Timestamp,
} from 'firebase/firestore'

let env
const ALICE = 'alice'
const BOB = 'bob'
const results = []

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-getoffschool',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
after(async () => {
  await env.cleanup()
  console.log('\nRESULTS_JSON ' + JSON.stringify(results))
})
beforeEach(async () => {
  await env.clearFirestore()
})

const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore())

/** 규칙을 건너뛰고 데이터 준비 */
const seed = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))

function postData(uid, extra = {}) {
  return {
    board: 'memo', text: '쉬는 시간에 스트레칭 1분', color: 'yellow', nick: '느긋한 출석부', uid,
    createdAt: serverTimestamp(), reactionCount: 0, reportCount: 0, hidden: false, ...extra,
  }
}
/** 글 + 도배 방지 문서를 한 번에 (앱과 같은 방식) */
function createPost(d, uid, id, extra) {
  const b = writeBatch(d)
  b.set(doc(d, 'posts', id), postData(uid, extra))
  b.set(doc(d, 'users', uid), { lastWriteAt: serverTimestamp() })
  return b.commit()
}
async function seedPost(id, uid, fields = {}) {
  await seed((d) =>
    setDoc(doc(d, 'posts', id), { ...postData(uid), createdAt: Timestamp.now(), ...fields }),
  )
}
function react(d, uid, id) {
  const b = writeBatch(d)
  b.set(doc(d, 'posts', id, 'reactions', uid), { createdAt: serverTimestamp() })
  b.update(doc(d, 'posts', id), { reactionCount: increment(1) })
  return b.commit()
}
function report(d, uid, id, hidden) {
  const b = writeBatch(d)
  b.set(doc(d, 'posts', id, 'reports', uid), { createdAt: serverTimestamp() })
  b.update(doc(d, 'posts', id), { reportCount: increment(1), hidden })
  return b.commit()
}

function t(name, expect, fn) {
  test(name, async () => {
    try {
      await fn()
      results.push({ name, expect, ok: true })
    } catch (e) {
      results.push({ name, expect, ok: false })
      throw e
    }
  })
}

// 1
t('정상 글 생성 (글 + 도배 방지 문서 batch)', '허용', async () => {
  await assertSucceeds(createPost(db(ALICE), ALICE, 'p1'))
})
// 2
t('61자 글 거절', '거절', async () => {
  await assertFails(createPost(db(ALICE), ALICE, 'p1', { text: '가'.repeat(61) }))
})
// 3
t('줄바꿈이 있는 글 거절', '거절', async () => {
  await assertFails(createPost(db(ALICE), ALICE, 'p1', { text: '첫 줄\n둘째 줄' }))
})
// 4
t('남의 uid 로 글 생성 거절', '거절', async () => {
  const d = db(ALICE)
  const b = writeBatch(d)
  b.set(doc(d, 'posts', 'p1'), postData(BOB))
  b.set(doc(d, 'users', ALICE), { lastWriteAt: serverTimestamp() })
  await assertFails(b.commit())
})
// 5
t('허용하지 않은 필드가 있으면 거절', '거절', async () => {
  await assertFails(createPost(db(ALICE), ALICE, 'p1', { isAdmin: true }))
})
// 6
t('반응·신고 수를 0이 아닌 값으로 생성 거절', '거절', async () => {
  await assertFails(createPost(db(ALICE), ALICE, 'p1', { reactionCount: 99 }))
})
// 7
t('도배 방지 문서 없이 글만 쓰면 거절', '거절', async () => {
  await assertFails(setDoc(doc(db(ALICE), 'posts', 'p1'), postData(ALICE)))
})
// 8
t('30초 이내 재작성 거절', '거절', async () => {
  const d = db(ALICE)
  await assertSucceeds(createPost(d, ALICE, 'p1'))
  await assertFails(createPost(d, ALICE, 'p2'))
})
// 9
t('30초가 지난 뒤 재작성 허용', '허용', async () => {
  await seed((d) => setDoc(doc(d, 'users', ALICE), { lastWriteAt: Timestamp.fromMillis(Date.now() - 31_000) }))
  await assertSucceeds(createPost(db(ALICE), ALICE, 'p2'))
})
// 10
t('남의 글 삭제 거절', '거절', async () => {
  await seedPost('p1', ALICE)
  await assertFails(deleteDoc(doc(db(BOB), 'posts', 'p1')))
})
// 11
t('내 글 삭제 허용', '허용', async () => {
  await seedPost('p1', ALICE)
  await assertSucceeds(deleteDoc(doc(db(ALICE), 'posts', 'p1')))
})
// 12
t('반응 1회 허용, 같은 사람 중복 반응 거절', '거절', async () => {
  await seedPost('p1', ALICE)
  await assertSucceeds(react(db(BOB), BOB, 'p1'))
  await assertFails(react(db(BOB), BOB, 'p1'))
})
// 13
t('반응 문서 없이 반응 수만 올리기 거절', '거절', async () => {
  await seedPost('p1', ALICE)
  await assertFails(updateDoc(doc(db(BOB), 'posts', 'p1'), { reactionCount: increment(1) }))
})
// 14
t('반응 취소(-1) 허용', '허용', async () => {
  await seedPost('p1', ALICE)
  await assertSucceeds(react(db(BOB), BOB, 'p1'))
  const d = db(BOB)
  const b = writeBatch(d)
  b.delete(doc(d, 'posts', 'p1', 'reactions', BOB))
  b.update(doc(d, 'posts', 'p1'), { reactionCount: increment(-1) })
  await assertSucceeds(b.commit())
})
// 15
t('신고 3건이면 숨김, 숨김을 빼먹으면 거절', '허용', async () => {
  await seedPost('p1', ALICE)
  await assertSucceeds(report(db('u1'), 'u1', 'p1', false))
  await assertSucceeds(report(db('u2'), 'u2', 'p1', false))
  await assertFails(report(db('u3'), 'u3', 'p1', false)) // 3건째인데 hidden=false → 거절
  await assertSucceeds(report(db('u3'), 'u3', 'p1', true))
  let snap
  await seed(async (d) => {
    snap = await getDoc(doc(d, 'posts', 'p1'))
  })
  assert.equal(snap.data().hidden, true)
  assert.equal(snap.data().reportCount, 3)
})
// 16
t('같은 사람 중복 신고 거절', '거절', async () => {
  await seedPost('p1', ALICE)
  await assertSucceeds(report(db('u1'), 'u1', 'p1', false))
  await assertFails(report(db('u1'), 'u1', 'p1', false))
})
// 17
t('글 내용 수정 거절', '거절', async () => {
  await seedPost('p1', ALICE)
  await assertFails(updateDoc(doc(db(ALICE), 'posts', 'p1'), { text: '바꾼 글' }))
})
// 18
t('숨김 글이 포함될 수 있는 목록 조회 거절, hidden==false 조건 조회 허용', '허용', async () => {
  await seedPost('p1', ALICE)
  const d = db(BOB)
  await assertFails(getDocs(query(collection(d, 'posts'), where('board', '==', 'memo'), limit(30))))
  await assertSucceeds(getDocs(query(collection(d, 'posts'), where('board', '==', 'memo'), where('hidden', '==', false), limit(30))))
})
// 19
t('로그인하지 않은 사용자 읽기·쓰기 거절', '거절', async () => {
  await seedPost('p1', ALICE)
  await assertFails(getDoc(doc(db(null), 'posts', 'p1')))
  await assertFails(setDoc(doc(db(null), 'posts', 'p2'), postData('x')))
})
// 20
t('마음 나누기: 정상 생성 허용, 101자 거절', '허용', async () => {
  const d = db(ALICE)
  const mk = (id, text) => {
    const b = writeBatch(d)
    b.set(doc(d, 'hearts', id), { text, nick: '졸린 분필', uid: ALICE, createdAt: serverTimestamp(), pat: 0, thanks: 0, together: 0, reportCount: 0, hidden: false })
    b.set(doc(d, 'users', ALICE), { lastWriteAt: serverTimestamp() })
    return b.commit()
  }
  await assertFails(mk('h1', '가'.repeat(101)))
  await assertSucceeds(mk('h2', '오늘 하루 길었어요'))
})
// 21
t('마음 반응: 고른 종류만 +1, 다른 칸 조작 거절', '허용', async () => {
  await seed((d) => setDoc(doc(d, 'hearts', 'h1'), { text: '힘들었어요', nick: 'n', uid: ALICE, createdAt: Timestamp.now(), pat: 0, thanks: 0, together: 0, reportCount: 0, hidden: false }))
  const d = db(BOB)
  const bad = writeBatch(d)
  bad.set(doc(d, 'hearts', 'h1', 'reactions', BOB), { kind: 'pat', createdAt: serverTimestamp() })
  bad.update(doc(d, 'hearts', 'h1'), { pat: increment(1), thanks: increment(5) })
  await assertFails(bad.commit())
  const ok = writeBatch(d)
  ok.set(doc(d, 'hearts', 'h1', 'reactions', BOB), { kind: 'pat', createdAt: serverTimestamp() })
  ok.update(doc(d, 'hearts', 'h1'), { pat: increment(1) })
  await assertSucceeds(ok.commit())
})
// 22
t('카운터 증가(1~50) 허용, 감소 거절', '거절', async () => {
  const d = db(ALICE)
  await assertSucceeds(setDoc(doc(d, 'daily', '2026-11-01'), { flung: increment(3) }, { merge: true }))
  await assertFails(setDoc(doc(d, 'daily', '2026-11-01'), { flung: increment(-1) }, { merge: true }))
})
// 23
t('카운터 한 번에 51 이상 증가 / 임의 값 설정 거절', '거절', async () => {
  const d = db(ALICE)
  await assertFails(setDoc(doc(d, 'counters', 'total'), { flung: increment(51) }, { merge: true }))
  await seed((x) => setDoc(doc(x, 'counters', 'total'), { flung: 100 }))
  await assertFails(setDoc(doc(d, 'counters', 'total'), { flung: 5 }, { merge: true }))
})
// 24
t('방문자 수: 방문 기록과 함께 1회 허용, 같은 날 두 번째 거절', '거절', async () => {
  const d = db(ALICE)
  const visit = () => {
    const b = writeBatch(d)
    b.set(doc(d, 'visits', '2026-11-01', 'users', ALICE), { createdAt: serverTimestamp() })
    b.set(doc(d, 'daily', '2026-11-01'), { visitors: increment(1) }, { merge: true })
    return b.commit()
  }
  await assertSucceeds(visit())
  await assertFails(visit())
  // 방문 기록 없이 방문자 수만 올리기도 거절
  await assertFails(setDoc(doc(db(BOB), 'daily', '2026-11-01'), { visitors: increment(1) }, { merge: true }))
})
