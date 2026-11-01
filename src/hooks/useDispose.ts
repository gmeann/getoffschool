import { useEffect } from 'react'

/** 직접 만든 지오메트리·재질은 장면을 떠날 때 GPU 메모리에서 정리 */
export function useDispose(...items: ({ dispose: () => void } | null | undefined)[]) {
  useEffect(
    () => () => {
      items.forEach((i) => i?.dispose())
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    items,
  )
}

/** 마우스를 올리면 손가락 커서 (PC) */
export const hoverCursor = {
  onPointerOver: () => {
    document.body.style.cursor = 'pointer'
  },
  onPointerOut: () => {
    document.body.style.cursor = ''
  },
}
