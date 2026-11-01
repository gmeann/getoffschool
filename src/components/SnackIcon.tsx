import type { Snack } from '../data/snacks'

/** 간식 아이콘: 이모지가 있으면 이모지, 없으면 간식 색의 동글동글한 도형 */
export function SnackIcon({ snack, locked = false, size = 40 }: { snack: Snack; locked?: boolean; size?: number }) {
  if (locked) {
    return (
      <span className="snack-icon locked" style={{ width: size, height: size, fontSize: size * 0.5 }}>
        ?
      </span>
    )
  }
  if (snack.emoji) {
    return (
      <span className="snack-icon emoji" style={{ width: size, height: size, fontSize: size * 0.72 }} aria-hidden>
        {snack.emoji}
      </span>
    )
  }
  return (
    <span
      className="snack-icon shape"
      style={{ width: size, height: size, background: snack.color, fontSize: size * 0.36 }}
      aria-hidden
    >
      {snack.name[0]}
    </span>
  )
}
