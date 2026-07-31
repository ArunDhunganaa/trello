import { Link } from 'react-router-dom'
import type { Board } from '../../types'
import { cn } from '../../lib/utils'

interface BoardCardProps {
  board: Board
  onStar: (id: string) => void
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function BoardCard({ board, onStar }: BoardCardProps) {
  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onStar(board.id)
  }

  return (
    <Link
      to={`/board/${board.id}`}
      className="relative h-28 rounded-xl flex flex-col justify-end p-3 group
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      style={{ backgroundColor: board.background }}
    >
      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/15 transition-colors" />

      {/* Star button */}
      <button
        type="button"
        onClick={handleStar}
        aria-label={board.is_starred ? 'Unstar board' : 'Star board'}
        className={cn(
          'absolute top-2 right-2 z-10 p-1 rounded transition-all',
          'text-white/70 hover:text-white',
          board.is_starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <StarIcon filled={board.is_starred} />
      </button>

      {/* Title */}
      <span className="relative z-10 text-white font-semibold text-sm leading-snug line-clamp-2 drop-shadow-sm">
        {board.title}
      </span>
    </Link>
  )
}
