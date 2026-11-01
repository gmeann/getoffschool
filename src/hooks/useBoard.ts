import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoardId } from '../data/boards'
import { boardService, type Post, type SortMode } from '../services/boardService'

/** 게시판 글 목록 불러오기 (boardService 만 사용) */
export function useBoard(board: BoardId, sort: SortMode) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const req = useRef(0)

  const reload = useCallback(async () => {
    const id = ++req.current
    setLoading(true)
    setError(null)
    try {
      const list = await boardService.getPosts(board, sort)
      if (id === req.current) setPosts(list)
    } catch {
      if (id === req.current) setError('글을 불러오지 못했어요. 잠시 후 다시 열어 주세요')
    } finally {
      if (id === req.current) setLoading(false)
    }
  }, [board, sort])

  useEffect(() => {
    void reload()
  }, [reload])

  return { posts, setPosts, loading, error, reload }
}

/** 모바일 키보드가 올라오면 그 높이만큼 (visualViewport) */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)
  const [viewH, setViewH] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight))
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
      setViewH(vv.height)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return { inset, viewH }
}
