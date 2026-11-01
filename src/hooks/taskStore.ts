/**
 * 교실 서류 더미 + 날리는 방식 (localStorage).
 * 키: getoffschool:pile:YYYY-MM-DD (남은 장수), getoffschool:flingMethod
 * 날짜가 바뀌면(로컬 자정, ?date= 로 강제 가능) 새 키라서 20장이 다시 쌓임.
 */
import { ALL_METHODS, DAILY_PAPERS, FLING_LINES, TASK_LABELS, TITLE_DONE, type FlingMethod, type MethodChoice, type TaskLabel } from '../data/tasks'
import { hashString } from '../data/quotes'
import { counterService } from '../services/counterService'
import { grantTitle } from './lapStore'
import { RESET_REQUESTED, storageGet, storageRemovePrefix, storageSet, todayKey } from './clock'

const KEY_METHOD = 'flingMethod'
const keyPile = () => `pile:${todayKey()}`

if (RESET_REQUESTED) storageRemovePrefix('pile:')

function readPile(): number {
  const v = storageGet(keyPile())
  return v === null ? DAILY_PAPERS : Math.max(0, Math.min(DAILY_PAPERS, Number(v) || 0))
}

function readMethod(): MethodChoice {
  const v = storageGet(KEY_METHOD)
  return v === 'airplane' || v === 'shredder' || v === 'eraser' || v === 'balloon' || v === 'random' ? v : 'airplane'
}

/** 오늘 쌓인 서류 순서 (날짜로 섞여서 같은 날엔 같은 순서) */
function labelsForToday(): TaskLabel[] {
  let seed = hashString(todayKey())
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const list = [...TASK_LABELS]
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

export type TaskUi = { remaining: number; method: MethodChoice; topLabel: TaskLabel | null }
let labels = labelsForToday()
const makeSnap = (remaining: number, method: MethodChoice): TaskUi => ({
  remaining,
  method,
  topLabel: remaining > 0 ? labels[(remaining - 1) % labels.length] : null,
})
let snap = makeSnap(readPile(), readMethod())
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function subscribeTasks(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export function getTaskUi() {
  return snap
}

export function setMethod(m: MethodChoice) {
  storageSet(KEY_METHOD, m)
  snap = { ...snap, method: m }
  emit()
}

let lastLine = ''
function pickLine() {
  let l = FLING_LINES[Math.floor(Math.random() * FLING_LINES.length)]
  while (l === lastLine) l = FLING_LINES[Math.floor(Math.random() * FLING_LINES.length)]
  lastLine = l
  return l
}

export type FlingResult = { label: TaskLabel; method: FlingMethod; line: string; remaining: number; done: boolean }

/** 맨 위 서류 한 장 날리기. 남은 게 없으면 null */
export function flingOne(): FlingResult | null {
  // 자정이 지났거나 ?date 가 바뀌었으면 새 더미로
  labels = labelsForToday()
  const remaining = readPile()
  if (remaining <= 0) {
    snap = makeSnap(0, snap.method)
    emit()
    return null
  }
  const label = labels[(remaining - 1) % labels.length]
  const next = remaining - 1
  storageSet(keyPile(), String(next))
  snap = makeSnap(next, snap.method)
  emit()
  void counterService.addOne()
  const method = snap.method === 'random' ? ALL_METHODS[Math.floor(Math.random() * ALL_METHODS.length)] : snap.method
  const done = next === 0
  if (done) grantTitle(TITLE_DONE)
  return { label, method, line: pickLine(), remaining: next, done }
}
