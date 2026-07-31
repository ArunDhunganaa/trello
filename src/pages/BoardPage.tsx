import { useEffect, useRef, useState } from 'react'
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
  const activeCardRef = useRef<Card | null>(null)

  // Visual card order during drag — keyed by list id.
  // State drives rendering; ref gives handlers always-current values without stale closures.
  const [sortedIdsByList, setSortedIdsByList] = useState<Record<string, string[]>>({})
  const dragRef = useRef<Record<string, string[]>>({})

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
    const card = cards.find((c) => c.id === active.id) ?? null
    activeCardRef.current = card
    setActiveCard(card)

    const byList: Record<string, string[]> = {}
    lists.forEach((l) => {
      byList[l.id] = cards
        .filter((c) => c.list_id === l.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => c.id)
    })
    dragRef.current = byList
    setSortedIdsByList(byList)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string

    // Always read from ref — never from the render-time closure (which may be stale)
    const current = dragRef.current
    const sourceListId = Object.entries(current).find(([, ids]) => ids.includes(activeId))?.[0]
    if (!sourceListId) return

    const isOverAList = lists.some((l) => l.id === overId)
    const targetListId = isOverAList ? overId : cards.find((c) => c.id === overId)?.list_id
    if (!targetListId) return

    let next: Record<string, string[]>

    if (sourceListId === targetListId) {
      const ids = [...(current[sourceListId] ?? [])]
      const fromIndex = ids.indexOf(activeId)
      const toIndex = ids.indexOf(overId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
      next = { ...current, [sourceListId]: arrayMove(ids, fromIndex, toIndex) }
    } else {
      const sourceIds = [...(current[sourceListId] ?? [])]
      const destIds = [...(current[targetListId] ?? [])]
      const fromIndex = sourceIds.indexOf(activeId)
      if (fromIndex === -1) return
      sourceIds.splice(fromIndex, 1)
      const toIndex = isOverAList ? destIds.length : destIds.indexOf(overId)
      destIds.splice(toIndex === -1 ? destIds.length : toIndex, 0, activeId)
      next = { ...current, [sourceListId]: sourceIds, [targetListId]: destIds }
    }

    dragRef.current = next
    setSortedIdsByList(next)
  }

  function handleDragEnd({ active }: DragEndEvent) {
    // Read from refs — state may lag behind the last handleDragOver call
    const draggedCard = activeCardRef.current
    activeCardRef.current = null
    setActiveCard(null)
    if (!draggedCard) return

    const current = dragRef.current
    dragRef.current = {}
    setSortedIdsByList({})

    let targetListId = draggedCard.list_id
    let finalIds: string[] = []
    for (const [listId, ids] of Object.entries(current)) {
      if (ids.includes(active.id as string)) {
        targetListId = listId
        finalIds = ids
        break
      }
    }

    const finalIndex = finalIds.indexOf(active.id as string)
    if (finalIndex === -1) return

    const neighborIds = finalIds.filter((id) => id !== active.id)
    const prevCard = cards.find((c) => c.id === neighborIds[finalIndex - 1])
    const nextCard = cards.find((c) => c.id === neighborIds[finalIndex])
    const newPosition = between(prevCard?.position ?? null, nextCard?.position ?? null)

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
