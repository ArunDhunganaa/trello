import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Card } from '../types'
import { between } from '../lib/fractional'
import { CardModal } from '../components/card/CardModal'
import { useBoardStore } from '../store/boardStore'
import { useListStore } from '../store/listStore'
import { useCardStore } from '../store/cardStore'
import { Navbar } from '../components/layout/Navbar'
import { BoardHeader } from '../components/board/BoardHeader'
import { ListColumn } from '../components/list/ListColumn'
import { AddListForm } from '../components/list/AddListForm'
import { CardDragOverlay } from '../components/card/CardItem'

export function BoardPage() {
  const { id } = useParams<{ id: string }>()

  const { currentBoard, fetchBoardById } = useBoardStore()
  const { lists, fetchLists, createList, clearLists } = useListStore()
  const { cards, fetchCards, updateCard, clearCards } = useCardStore()

  const [activeCard, setActiveCard] = useState<Card | null>(null)
  // Visual card order during drag — keyed by list id
  const [sortedIdsByList, setSortedIdsByList] = useState<Record<string, string[]>>({})
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  function getCardsForList(listId: string): Card[] {
    if (Object.keys(sortedIdsByList).length === 0) {
      return cards.filter((c) => c.list_id === listId).sort((a, b) => a.position - b.position)
    }
    const ids = sortedIdsByList[listId] ?? []
    return ids
      .map((cardId) => cards.find((c) => c.id === cardId))
      .filter((c): c is Card => c !== undefined)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveCard(cards.find((c) => c.id === active.id) ?? null)
    const byList: Record<string, string[]> = {}
    lists.forEach((l) => {
      byList[l.id] = cards
        .filter((c) => c.list_id === l.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => c.id)
    })
    setSortedIdsByList(byList)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string

    // Find which list currently holds the dragged card
    const sourceListId = Object.entries(sortedIdsByList).find(([, ids]) =>
      ids.includes(activeId)
    )?.[0]
    if (!sourceListId) return

    const isOverAList = lists.some((l) => l.id === overId)
    const targetListId = isOverAList ? overId : cards.find((c) => c.id === overId)?.list_id
    if (!targetListId) return

    setSortedIdsByList((prev) => {
      if (sourceListId === targetListId) {
        const ids = [...(prev[sourceListId] ?? [])]
        const fromIndex = ids.indexOf(activeId)
        const toIndex = ids.indexOf(overId)
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev
        return { ...prev, [sourceListId]: arrayMove(ids, fromIndex, toIndex) }
      }

      // Cross-list: remove from source, insert at over position in dest
      const sourceIds = [...(prev[sourceListId] ?? [])]
      const destIds = [...(prev[targetListId] ?? [])]
      const fromIndex = sourceIds.indexOf(activeId)
      if (fromIndex === -1) return prev
      sourceIds.splice(fromIndex, 1)
      const toIndex = isOverAList ? destIds.length : destIds.indexOf(overId)
      destIds.splice(toIndex === -1 ? destIds.length : toIndex, 0, activeId)
      return { ...prev, [sourceListId]: sourceIds, [targetListId]: destIds }
    })
  }

  function handleDragEnd({ active }: DragEndEvent) {
    const draggedCard = activeCard
    setActiveCard(null)
    if (!draggedCard) return

    // Find which list the card landed in and its final index
    let targetListId = draggedCard.list_id
    let finalIds: string[] = []
    for (const [listId, ids] of Object.entries(sortedIdsByList)) {
      if (ids.includes(active.id as string)) {
        targetListId = listId
        finalIds = ids
        break
      }
    }

    setSortedIdsByList({})

    const finalIndex = finalIds.indexOf(active.id as string)
    if (finalIndex === -1) return

    // Compute new fractional position from neighbors (excluding the active card itself)
    const neighborIds = finalIds.filter((id) => id !== active.id)
    const prevCard = cards.find((c) => c.id === neighborIds[finalIndex - 1])
    const nextCard = cards.find((c) => c.id === neighborIds[finalIndex])
    const newPosition = between(prevCard?.position ?? null, nextCard?.position ?? null)

    // Skip if nothing changed
    if (newPosition === draggedCard.position && targetListId === draggedCard.list_id) return

    const updates: Partial<Card> = { position: newPosition }
    if (targetListId !== draggedCard.list_id) updates.list_id = targetListId
    updateCard(draggedCard.id, updates)
  }

  const boardBg = currentBoard?.background ?? '#0079bf'

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: boardBg }}>
      <Navbar />
      {currentBoard && <BoardHeader board={currentBoard} />}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <main className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex items-start gap-3 p-4 h-full">
            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                cards={getCardsForList(list.id)}
                onCardClick={(card) => setSelectedCardId(card.id)}
              />
            ))}
            <AddListForm onAdd={(title) => createList(id, title)} />
          </div>
        </main>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeCard && <CardDragOverlay card={activeCard} />}
        </DragOverlay>
      </DndContext>

      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          listName={
            lists.find((l) => l.id === cards.find((c) => c.id === selectedCardId)?.list_id)
              ?.title ?? ''
          }
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  )
}
