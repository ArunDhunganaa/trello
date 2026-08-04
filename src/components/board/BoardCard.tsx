import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Board } from '../../types'
import { cn, getBoardBgStyle } from '../../lib/utils'

interface BoardCardProps {
  board: Board
  onStar: (id: string) => void
  onDelete: (id: string) => void
  onReopen?: (id: string) => void
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

export function BoardCard({ board, onStar, onDelete, onReopen }: BoardCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setConfirmingDelete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function stop(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleStar(e: React.MouseEvent) {
    stop(e)
    onStar(board.id)
  }

  function handleMenuToggle(e: React.MouseEvent) {
    stop(e)
    setMenuOpen((v) => !v)
    setConfirmingDelete(false)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    stop(e)
    setConfirmingDelete(true)
  }

  function handleDeleteConfirm(e: React.MouseEvent) {
    stop(e)
    onDelete(board.id)
    setMenuOpen(false)
  }

  function handleCancel(e: React.MouseEvent) {
    stop(e)
    setConfirmingDelete(false)
  }

  return (
    <Link
      to={`/board/${board.id}`}
      className="relative h-24 rounded-lg flex flex-col justify-end p-3 group
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-trello-blue"
      style={getBoardBgStyle(board.background)}
    >
      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/15 transition-colors" />

      {/* Star button — hidden on archived boards */}
      {!board.is_archived && (
        <button
          type="button"
          onClick={handleStar}
          aria-label={board.is_starred ? 'Unstar board' : 'Star board'}
          className={cn(
            'absolute top-2 right-2 z-10 p-1 rounded transition-all',
            'text-white/70 hover:text-white',
            board.is_starred
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          )}
        >
          <StarIcon filled={board.is_starred} />
        </button>
      )}

      {/* Archived badge */}
      {board.is_archived && (
        <span className="absolute top-2 right-2 z-10 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-black/40 text-white/80">
          Closed
        </span>
      )}

      {/* ⋯ menu — only on closed boards */}
      {board.is_archived && (
        <div
          ref={menuRef}
          className={cn(
            'absolute top-2 left-2 z-10 transition-all',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
          )}
        >
          <button
            type="button"
            onClick={handleMenuToggle}
            aria-label="Board options"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className="p-1 rounded text-white/70 hover:text-white hover:bg-black/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-1 w-44 rounded-lg bg-white shadow-xl border border-zinc-200 overflow-hidden"
            >
              {confirmingDelete ? (
                <div className="p-3">
                  <p className="text-xs font-semibold text-zinc-700 mb-2">Delete this board?</p>
                  <p className="text-xs text-zinc-500 mb-3">
                    This is permanent and cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteConfirm}
                      className="flex-1 rounded bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 rounded bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {board.is_archived && (
                    <>
                      <button
                        role="menuitem"
                        onClick={(e) => {
                          stop(e)
                          onReopen?.(board.id)
                          setMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="text-zinc-400 shrink-0"
                          aria-hidden="true"
                        >
                          <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18z" />
                        </svg>
                        Reopen board
                      </button>
                      <div className="h-px bg-zinc-100" />
                    </>
                  )}
                  <button
                    role="menuitem"
                    onClick={handleDeleteClick}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    Delete board
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <span className="relative z-10 text-white font-semibold text-sm leading-snug line-clamp-2 drop-shadow-sm">
        {board.title}
      </span>
    </Link>
  )
}
