import { useEffect, useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import { Navbar } from '../components/layout/Navbar'
import { BoardCard } from '../components/board/BoardCard'
import { CreateBoardModal } from '../components/board/CreateBoardModal'

function BoardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-gray-200 animate-pulse" />
      ))}
    </div>
  )
}

function CreateBoardCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-28 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors
                 flex flex-col items-center justify-center gap-1.5
                 text-gray-600 hover:text-gray-800 text-sm font-medium
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <svg
        width="20"
        height="20"
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
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function DashboardPage() {
  const boards = useBoardStore((s) => s.boards)
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  const toggleStar = useBoardStore((s) => s.toggleStar)
  const isLoading = useBoardStore((s) => s.isLoading)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  const starred = boards.filter((b) => b.is_starred)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Starred boards */}
        {starred.length > 0 && (
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              <StarIcon />
              Starred boards
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {starred.map((board) => (
                <BoardCard key={board.id} board={board} onStar={toggleStar} />
              ))}
            </div>
          </section>
        )}

        {/* All boards */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Your boards
          </h2>

          {isLoading ? (
            <BoardGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {boards.map((board) => (
                <BoardCard key={board.id} board={board} onStar={toggleStar} />
              ))}
              <CreateBoardCard onClick={() => setShowCreate(true)} />
            </div>
          )}
        </section>
      </main>

      {showCreate && <CreateBoardModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
