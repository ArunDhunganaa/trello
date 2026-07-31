import { Link } from 'react-router-dom'
import type { Board } from '../../types'
import { useBoardStore } from '../../store/boardStore'

interface BoardHeaderProps {
  board: Board
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const toggleStar = useBoardStore((s) => s.toggleStar)

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-black/20 backdrop-blur-sm">
      <Link
        to="/boards"
        className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium transition-colors"
        aria-label="Back to boards"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        Boards
      </Link>

      <div className="w-px h-5 bg-white/30" aria-hidden="true" />

      <h1 className="text-white font-semibold text-sm">{board.title}</h1>

      <button
        onClick={() => toggleStar(board.id)}
        aria-label={board.is_starred ? 'Unstar board' : 'Star board'}
        className="text-white/70 hover:text-white transition-colors"
      >
        {board.is_starred ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        )}
      </button>
    </header>
  )
}
