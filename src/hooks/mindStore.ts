/**
 * 마음 띄우기에서 저장하는 유일한 값: "오늘 마음을 띄웠는지" 날짜 하나.
 * 글 내용·횟수·위기 감지 여부는 저장하지 않습니다.
 * 키: getoffschool:mind:floatedOn = 'YYYY-MM-DD' (로컬 날짜, 날짜가 바뀌면 효력 없음)
 */
import { RESET_REQUESTED, storageGet, storageRemove, storageSet, todayKey } from './clock'

const KEY = 'mind:floatedOn'
if (RESET_REQUESTED) storageRemove(KEY)

export function floatedToday(): boolean {
  return storageGet(KEY) === todayKey()
}
export function markFloatedToday() {
  storageSet(KEY, todayKey())
}
