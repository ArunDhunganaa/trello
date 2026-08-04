import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { Navbar } from '../components/layout/Navbar'
import { BoardCard } from '../components/board/BoardCard'
import { CreateBoardModal } from '../components/board/CreateBoardModal'
import { Skeleton } from '../components/ui/Skeleton'
import { getBoardBgStyle } from '../lib/utils'

function BoardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}

function CreateBoardCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-24 rounded-lg bg-[#F0F1F2] hover:bg-[#E1E3E6] transition-colors
                 flex flex-col items-center justify-center gap-1.5
                 text-muted-text hover:text-heading-text text-sm font-medium
                 focus:outline-none focus:ring-2 focus:ring-trello-blue focus:ring-offset-2"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Create new board
    </button>
  )
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function DashboardPage() {
  const boards = useBoardStore((s) => s.boards)
  const archivedBoards = useBoardStore((s) => s.archivedBoards)
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  const fetchArchivedBoards = useBoardStore((s) => s.fetchArchivedBoards)
  const toggleStar = useBoardStore((s) => s.toggleStar)
  const deleteBoard = useBoardStore((s) => s.deleteBoard)
  const updateBoard = useBoardStore((s) => s.updateBoard)
  const isLoading = useBoardStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)
  const [showCreate, setShowCreate] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  function handleToggleArchived() {
    if (!showArchived) void fetchArchivedBoards()
    setShowArchived((v) => !v)
  }

  const activeBoards = boards.filter((b) => !b.is_archived)
  const starred = activeBoards.filter((b) => b.is_starred)
  const workspaceInitial = user?.email?.[0]?.toUpperCase() ?? '?'

  function handleReopen(id: string) {
    void updateBoard(id, { is_archived: false })
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col">
      <Navbar onCreateBoard={() => setShowCreate(true)} />

      <div className="flex flex-1">
        {/* ── Left sidebar ────────────────────────────────── */}
        <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex-col hidden sm:flex">
          {/* Workspace header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              {workspaceInitial}
            </div>
            <span className="font-semibold text-sm text-heading-text truncate">My Workspace</span>
          </div>

          {/* Nav links */}
          <nav aria-label="Workspace navigation">
            <div className="px-2 pt-2 pb-1">
              <Link
                to="/boards"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium bg-sidebar-active text-sidebar-active-text"
                aria-current="page"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="2" y="3" width="7" height="14" rx="1.5" />
                  <rect x="13" y="3" width="9" height="9" rx="1.5" />
                  <rect x="13" y="16" width="9" height="5" rx="1.5" />
                </svg>
                Boards
              </Link>
            </div>
          </nav>

          <div className="h-px bg-gray-100 mx-4 my-2" />

          {/* Quick board list */}
          <p className="px-4 text-[11px] font-bold text-muted-text uppercase tracking-wider mb-1">
            Your boards
          </p>
          <div className="px-2 pb-4 flex flex-col gap-0.5">
            {activeBoards.slice(0, 10).map((board) => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-heading-text hover:bg-board-item-hover transition-colors"
              >
                <div
                  className="w-5 h-4 rounded shrink-0"
                  style={getBoardBgStyle(board.background)}
                  aria-hidden="true"
                />
                <span className="truncate">{board.title}</span>
                {board.is_starred && (
                  <span className="ml-auto text-yellow-400 shrink-0" aria-label="Starred">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                )}
              </Link>
            ))}
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Starred boards */}
            {starred.length > 0 && (
              <section className="mb-10">
                <h2 className="flex items-center gap-2 text-sm font-bold text-muted-text mb-4">
                  <StarIcon />
                  Starred boards
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {starred.map((board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      onStar={toggleStar}
                      onDelete={deleteBoard}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All boards */}
            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-muted-text mb-4">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                Your boards
              </h2>

              {isLoading ? (
                <BoardGridSkeleton />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {activeBoards.map((board) => (
                    <BoardCard
                      key={board.id}
                      board={board}
                      onStar={toggleStar}
                      onDelete={deleteBoard}
                    />
                  ))}
                  <CreateBoardCard onClick={() => setShowCreate(true)} />
                </div>
              )}
            </section>

            {/* Closed boards */}
            <section className="mt-10">
              <button
                type="button"
                onClick={handleToggleArchived}
                aria-expanded={showArchived}
                className="flex items-center gap-2 text-sm font-bold text-muted-text hover:text-heading-text transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" />
                </svg>
                Closed boards
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className={showArchived ? 'rotate-180' : ''}
                  style={{ transition: 'transform 0.15s' }}
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {showArchived && (
                <div className="mt-4">
                  {archivedBoards.length === 0 ? (
                    <p className="text-sm text-muted-text">No closed boards.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {archivedBoards.map((board) => (
                        <div
                          key={board.id}
                          className="opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <BoardCard
                            board={board}
                            onStar={toggleStar}
                            onDelete={deleteBoard}
                            onReopen={handleReopen}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {showCreate && <CreateBoardModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
