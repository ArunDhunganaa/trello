import { useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useListStore } from '../store/listStore'
import { useCardStore } from '../store/cardStore'
import { Navbar } from '../components/layout/Navbar'
import { BoardHeader } from '../components/board/BoardHeader'
import { ListColumn } from '../components/list/ListColumn'
import { AddListForm } from '../components/list/AddListForm'

export function BoardPage() {
  const { id } = useParams<{ id: string }>()

  const { currentBoard, fetchBoardById } = useBoardStore()
  const { lists, fetchLists, createList, clearLists } = useListStore()
  const { cards, fetchCards, clearCards } = useCardStore()

  useEffect(() => {
    if (!id) return
    fetchBoardById(id)
    fetchLists(id)
    fetchCards(id)

    return () => {
      clearLists()
      clearCards()
    }
  }, [id, fetchBoardById, fetchLists, fetchCards, clearLists, clearCards])

  if (!id) return <Navigate to="/boards" />

  const boardBg = currentBoard?.background ?? '#0079bf'

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: boardBg }}>
      <Navbar />

      {currentBoard && <BoardHeader board={currentBoard} />}

      {/* Board canvas: horizontal scroll, no vertical scroll */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex items-start gap-3 p-4 h-full">
          {lists.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              cards={cards
                .filter((c) => c.list_id === list.id)
                .sort((a, b) => a.position - b.position)}
            />
          ))}

          <AddListForm onAdd={(title) => createList(id, title)} />
        </div>
      </main>
    </div>
  )
}
