/**
 * 교실 서류 더미 + 날리는 방식 (localStorage).
 * - 기본 서류: 하루 20장. 키 getoffschool:pile:YYYY-MM-DD (남은 장수)
 *   날린다고 바로 다시 채워지지는 않고, 날짜가 바뀌면(로컬 자정, ?date= 로 강제 가능) 20장이 다시 쌓임
 * - 내가 추가한 서류: 더미 맨 위에 쌓임. 키 getoffschool:custom:YYYY-MM-DD (남은 목록, 마지막이 맨 위)
 * - 방식: getoffschool:flingMethod
 */
import {
  ALL_METHODS,
  CUSTOM_COLORS,
  CUSTOM_NAME_MAX,
  DAILY_PAPERS,
  FLING_LINES,
  MAX_CUSTOM_PAPERS,
  TASK_LABELS,
  TITLE_DONE,
  type FlingMethod,
  type MethodChoice,
  type TaskLabel,
} from '../data/tasks'
import { hashString } from '../data/quotes'
import { counterService } from '../services/counterService'
import { grantTitle } from './lapStore'
import { RESET_REQUESTED, storageGet, storageRemovePrefix, storageSet, todayKey } from './clock'

const KEY_METHOD = 'flingMethod'
const keyPile = () => `pile:${todayKey()}`
const keyCustom = () => `custom:${todayKey()}`

if (RESET_REQUESTED) {
  storageRemovePrefix('pile:')
  storageRemovePrefix('custom:')
}

function readPile(): number {
  const v = storageGet(keyPile())
  return v === null ? DAILY_PAPERS : Math.max(0, Math.min(DAILY_PAPERS, Number(v) || 0))
}

function readCustom(): TaskLabel[] {
  try {
    const v = JSON.parse(storageGet(keyCustom()) || '[]')
    return Array.isArray(v) ? v.filter((x) => x && typeof x.name === 'string' && typeof x.color === 'string') : []
  } catch {
    return []
  }
}

function readMethod(): MethodChoice {
  const v = storageGet(KEY_METHOD)
  return v === 'airplane' || v === 'shredder' || v === 'eraser' || v === 'balloon' || v === 'random' ? v : 'airplane'
}

/** 오늘 쌓인 기본 서류 순서 (날짜로 섞여서 같은 날엔 같은 순서) */
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

export type TaskUi = {
  /** 더미 전체 남은 장수 (기본 + 내가 추가) */
  remaining: number
  /** 그중 내가 추가한 장수 */
  custom: number
  method: MethodChoice
  topLabel: TaskLabel | null
}

let labels = labelsForToday()
function makeSnap(method: MethodChoice): TaskUi {
  const base = readPile()
  const custom = readCustom()
  const top = custom.length > 0 ? custom[custom.length - 1] : base > 0 ? labels[(base - 1) % labels.length] : null
  return { remaining: base + custom.length, custom: custom.length, method, topLabel: top }
}
let snap = makeSnap(readMethod())
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

/** 내 서류 추가: 더미 맨 위에 올라감. 성공하면 true */
export function addCustomPaper(rawName: string): { ok: true; label: TaskLabel } | { ok: false; reason: string } {
  const name = rawName.trim().slice(0, CUSTOM_NAME_MAX)
  if (!name) return { ok: false, reason: '서류 이름을 적어 주세요' }
  const list = readCustom()
  if (list.length >= MAX_CUSTOM_PAPERS) return { ok: false, reason: `오늘은 ${MAX_CUSTOM_PAPERS}장까지 추가할 수 있어요` }
  const label = { name, color: CUSTOM_COLORS[list.length % CUSTOM_COLORS.length] }
  storageSet(keyCustom(), JSON.stringify([...list, label]))
  snap = makeSnap(snap.method)
  emit()
  return { ok: true, label }
}

let lastLine = ''
function pickLine() {
  let l = FLING_LINES[Math.floor(Math.random() * FLING_LINES.length)]
  while (l === lastLine) l = FLING_LINES[Math.floor(Math.random() * FLING_LINES.length)]
  lastLine = l
  return l
}

export type FlingResult = { label: TaskLabel; method: FlingMethod; line: string; remaining: number; done: boolean; custom: boolean }

/** 맨 위 서류 한 장 날리기 (내가 추가한 서류부터). 남은 게 없으면 null */
export function flingOne(): FlingResult | null {
  // 자정이 지났거나 ?date 가 바뀌었으면 새 더미로
  labels = labelsForToday()
  const custom = readCustom()
  const base = readPile()
  let label: TaskLabel
  let isCustom = false
  if (custom.length > 0) {
    label = custom[custom.length - 1]
    storageSet(keyCustom(), JSON.stringify(custom.slice(0, -1)))
    isCustom = true
  } else if (base > 0) {
    label = labels[(base - 1) % labels.length]
    storageSet(keyPile(), String(base - 1))
  } else {
    snap = makeSnap(snap.method)
    emit()
    return null
  }
  snap = makeSnap(snap.method)
  emit()
  void counterService.addOne()
  const method = snap.method === 'random' ? ALL_METHODS[Math.floor(Math.random() * ALL_METHODS.length)] : snap.method
  const done = snap.remaining === 0
  if (done) grantTitle(TITLE_DONE)
  return { label, method, line: pickLine(), remaining: snap.remaining, done, custom: isCustom }
}
