/** 처음 한 번만 보여 주는 안내 (localStorage 는 여기서만 다룸) */
import { RESET_REQUESTED, storageGet, storageRemove, storageSet } from './clock'

const KEY_LAB_GUIDE = 'guide:lab'
if (RESET_REQUESTED) storageRemove(KEY_LAB_GUIDE)

export function shouldShowLabGuide(): boolean {
  return storageGet(KEY_LAB_GUIDE) !== '1'
}
export function markLabGuideSeen() {
  storageSet(KEY_LAB_GUIDE, '1')
}
