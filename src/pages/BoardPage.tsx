import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Card } from '../types'
import { between } from '../lib/fractional'
import { getBoardBgStyle } from '../lib/utils'
import { CardModal } from '../components/card/CardModal'
import { useBoardStore } from '../store/boardStore'
import { useListStore } from '../store/listStore'
import { useCardStore } from '../store/cardStore'
import { Navbar } from '../components/layout/Navbar'
import { BoardHeader } from '../components/board/BoardHeader'
import { ListColumn } from '../components/list/ListColumn'
import { AddListForm } from '../components/list/AddListForm'
import { CardDragOverlay } from '../components/card/CardItem'
import { useRealtimeBoard } from '../hooks/useRealtimeBoard'
import { useBoardMembers } from '../hooks/useBoardMembers'
import { useLabelStore } from '../store/labelStore'
function BoardColumnSkeleton() {
  return (
    <div className="w-72 shrink-0 rounded-xl bg-black/10 backdrop-blur-sm p-3 flex flex-col gap-2.5">
      <div className="animate-pulse h-5 w-28 rounded bg-white/25" />
      <div className="animate-pulse h-14 w-full rounded-lg bg-white/25" />
      <div className="animate-pulse h-10 w-full rounded-lg bg-white/25" />
      <div className="animate-pulse h-16 w-full rounded-lg bg-white/25" />
    </div>
  )
}

export function BoardPage() {
  const { id } = useParams<{ id: string }>()

  const { currentBoard, fetchBoardById } = useBoardStore()
  const { lists, fetchLists, createList, clearLists, isLoading: listsLoading } = useListStore()
  const { cards, fetchCards, updateCard, clearCards } = useCardStore()
  const { fetchBoardData, clearLabels } = useLabelStore()

  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const activeCardRef = useRef<Card | null>(null)

  // Visual card order during drag — keyed by list id.
  // State drives rendering; ref gives handlers always-current values without stale closures.
  const [sortedIdsByList, setSortedIdsByList] = useState<Record<string, string[]>>({})
  const dragRef = useRef<Record<string, string[]>>({})

  // For cross-list drags: defer clearing sortedIdsByList until the cards store
  // confirms the new list_id. Zustand 5 doesn't batch its set() with useState
  // setters, so clearing too early produces a one-frame flash.
  const pendingMove = useRef<{ cardId: string; targetListId: string } | null>(null)

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const handleCardClick = useCallback((card: Card) => setSelectedCardId(card.id), [])

  const [collapsedListIds, setCollapsedListIds] = useState<Set<string>>(new Set())
  const toggleListCollapse = useCallback((listId: string) => {
    setCollapsedListIds((prev) => {
      const next = new Set(prev)
      if (next.has(listId)) next.delete(listId)
      else next.add(listId)
      return next
    })
  }, [])

  const { members, setMembers, canManage } = useBoardMembers(id, currentBoard?.owner_id)

  useRealtimeBoard(id)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!id) return
    fetchBoardById(id)
    fetchLists(id)
    fetchCards(id)
    fetchBoardData(id).catch(() => {})
    return () => {
      clearLists()
      clearCards()
      clearLabels()
    }
  }, [
    id,
    fetchBoardById,
    fetchLists,
    fetchCards,
    clearLists,
    clearCards,
    fetchBoardData,
    clearLabels,
  ])

  // Once the cards store shows the moved card in its target list, it's safe
  // to drop the sortedIdsByList overlay without any intermediate flash.
  useEffect(() => {
    if (!pendingMove.current) return
    const { cardId, targetListId } = pendingMove.current
    const card = cards.find((c) => c.id === cardId)
    if (card?.list_id === targetListId) {
      pendingMove.current = null
      setSortedIdsByList({})
    }
  }, [cards])

  if (!id) return <Navigate to="/boards" />

  function getCardsForList(listId: string): Card[] {
    const seen = new Set<string>()
    if (Object.keys(sortedIdsByList).length === 0) {
      return cards
        .filter((c) => {
          if (c.list_id !== listId || seen.has(c.id)) return false
          seen.add(c.id)
          return true
        })
        .sort((a, b) => a.position - b.position)
    }
    const ids = sortedIdsByList[listId] ?? []
    return ids
      .map((cardId) => cards.find((c) => c.id === cardId))
      .filter((c): c is Card => {
        if (!c || seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
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
  }

  function handleDragEnd({ active }: DragEndEvent) {
    // Read from refs — state may lag behind the last handleDragOver call
    const draggedCard = activeCardRef.current
    activeCardRef.current = null
    setActiveCard(null)
    if (!draggedCard) return

    const current = dragRef.current
    dragRef.current = {}

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

    const isCrossListMove = targetListId !== draggedCard.list_id
    const updates: Partial<Card> = { position: newPosition }
    if (isCrossListMove) updates.list_id = targetListId

    const hasChange = isCrossListMove || newPosition !== draggedCard.position
    if (hasChange) updateCard(draggedCard.id, updates)

    if (isCrossListMove) {
      // Apply the final drag state visually now (first render after drop).
      // The useEffect above watches cards and clears it once the store confirms
      // the new list_id — this is the only way to avoid the one-frame flash in
      // Zustand 5, which doesn't batch its set() with React useState setters.
      setSortedIdsByList(current)
      pendingMove.current = { cardId: draggedCard.id, targetListId }
    } else {
      setSortedIdsByList({})
    }
  }

  const boardBg = currentBoard?.background ?? '#0079bf'

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={getBoardBgStyle(boardBg)}>
      <Navbar />
      {currentBoard && (
        <BoardHeader
          board={currentBoard}
          members={members}
          setMembers={setMembers}
          canManage={canManage}
          allCollapsed={lists.length > 0 && lists.every((l) => collapsedListIds.has(l.id))}
          onCollapseAll={() => setCollapsedListIds(new Set(lists.map((l) => l.id)))}
          onExpandAll={() => setCollapsedListIds(new Set())}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <main className="flex-1 overflow-x-auto overflow-y-hidden">
          {listsLoading ? (
            <div className="flex items-start gap-3 p-4">
              {[0, 1, 2].map((i) => (
                <BoardColumnSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 h-full">
              {lists.map((list) => (
                <ListColumn
                  key={list.id}
                  list={list}
                  cards={getCardsForList(list.id)}
                  onCardClick={handleCardClick}
                  canManage={canManage}
                  collapsed={collapsedListIds.has(list.id)}
                  onToggleCollapse={() => toggleListCollapse(list.id)}
                />
              ))}
              <AddListForm onAdd={(title) => createList(id, title)} disabled={!canManage} />
            </div>
          )}
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
