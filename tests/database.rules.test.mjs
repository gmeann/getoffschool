/**
 * Realtime Database 보안 규칙 테스트 (에뮬레이터에서 실행)
 * 실행: npm run test:db
 */
import { test, before, after, beforeEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, set, get, remove, update } from 'firebase/database'

let env
const ok = { i: 3, x: 1.25, z: -4, r: 0.5, p: 'walk', l: 0.24 }

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-getoffschool',
    database: { rules: readFileSync('database.rules.json', 'utf8'), host: '127.0.0.1', port: 9000 },
  })
})
after(() => env.cleanup())
beforeEach(() => env.clearDatabase())

const db = (uid) => (uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database())

test('내 위치 쓰기·지우기 허용, 같은 공간 읽기 허용', async () => {
  await assertSucceeds(set(ref(db('alice'), 'presence/playground/alice'), ok))
  await assertSucceeds(get(ref(db('bob'), 'presence/playground')))
  await assertSucceeds(remove(ref(db('alice'), 'presence/playground/alice')))
})

test('남의 위치 쓰기 거절', async () => {
  await assertFails(set(ref(db('bob'), 'presence/playground/alice'), ok))
})

test('로그인 안 하면 읽기·쓰기 거절', async () => {
  await assertFails(get(ref(db(null), 'presence/playground')))
  await assertFails(get(ref(db(null), 'online')))
  await assertFails(set(ref(db(null), 'presence/playground/x'), ok))
})

test('없는 공간 이름 거절', async () => {
  await assertFails(set(ref(db('alice'), 'presence/secret/alice'), ok))
  await assertFails(set(ref(db('alice'), 'online/alice'), 'secret'))
})

test('자유 글자·추가 필드 거절 (이름은 번호로만)', async () => {
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...ok, name: '아무 글' }))
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...ok, i: '퇴근' }))
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...ok, i: 1.5 }))
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...ok, p: 'dance' }))
})

test('범위 밖 위치·빠진 필드 거절', async () => {
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...ok, x: 500 }))
  const { l, ...missing } = ok
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), missing))
})

test('접속 표시: 내 것만, 공간 이름만', async () => {
  await assertSucceeds(set(ref(db('alice'), 'online/alice'), 'lab'))
  await assertSucceeds(get(ref(db('bob'), 'online')))
  await assertFails(set(ref(db('bob'), 'online/alice'), 'lab'))
  await assertFails(set(ref(db('alice'), 'online/alice'), { x: 1 }))
})

test('최상위·다른 경로 읽기·쓰기 거절', async () => {
  await assertFails(get(ref(db('alice'), '/')))
  await assertFails(get(ref(db('alice'), 'presence')))
  await assertFails(set(ref(db('alice'), 'other/alice'), 1))
  await assertFails(update(ref(db('alice'), '/'), { 'online/bob': 'lab' }))
})

test('반응·인사: 번호와 uid 만 허용', async () => {
  const full = { ...ok, e: 101, s: 3, g: 'bob', gs: 2, gk: 1 }
  await assertSucceeds(set(ref(db('alice'), 'presence/playground/alice'), full))
  await assertSucceeds(set(ref(db('alice'), 'presence/playground/alice'), { ...full, g: '' }))
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...full, e: '수고했어요' }))
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...full, e: 999 }))
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...full, g: '아무 말이나 <b>' }))
  await assertFails(set(ref(db('alice'), 'presence/playground/alice'), { ...full, gk: 2 }))
})
