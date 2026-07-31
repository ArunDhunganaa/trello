import { useRef, useState } from 'react'
import type { Card, List } from '../../types'
import { useListStore } from '../../store/listStore'
import { useCardStore } from '../../store/cardStore'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CardItem } from '../card/CardItem'
import { AddCardForm } from '../card/AddCardForm'

interface ListColumnProps {
  list: List
  cards: Card[]
  onCardClick: (card: Card) => void
}

export function ListColumn({ list, cards, onCardClick }: ListColumnProps) {
  const updateList = useListStore((s) => s.updateList)
  const deleteList = useListStore((s) => s.deleteList)
  const createCard = useCardStore((s) => s.createCard)

  const [addingCard, setAddingCard] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(list.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const { setNodeRef } = useDroppable({ id: list.id })
  const cardIds = cards.map((c) => c.id)

  function commitTitleEdit() {
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== list.title) {
      updateList(list.id, { title: trimmed })
    } else {
      setDraftTitle(list.title)
    }
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitTitleEdit()
    if (e.key === 'Escape') {
      setDraftTitle(list.title)
      setEditingTitle(false)
    }
  }

  return (
    <div className="w-72 shrink-0 max-h-full flex flex-col rounded-xl bg-zinc-100 dark:bg-zinc-800">
      {/* List header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 gap-2">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className="flex-1 rounded border border-brand-500 bg-white dark:bg-zinc-900 px-2 py-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        ) : (
          <button
            onClick={() => {
              setEditingTitle(true)
              setTimeout(() => titleInputRef.current?.select(), 0)
            }}
            className="flex-1 text-left text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded px-2 py-0.5 transition-colors"
          >
            {list.title}
          </button>
        )}
        <button
          onClick={() => deleteList(list.id)}
          aria-label="Delete list"
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {/* Cards scroll area — also the droppable for empty-list drops */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex-1 overflow-y-auto px-2 flex flex-col gap-2 py-1 min-h-[60px]"
        >
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </div>
      </SortableContext>

      {/* Add card area */}
      <div className="pt-1">
        {addingCard ? (
          <AddCardForm
            onAdd={(title) => {
              createCard(list.id, list.board_id, title)
              setAddingCard(false)
            }}
            onClose={() => setAddingCard(false)}
          />
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-b-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Add a card
          </button>
        )}
      </div>
    </div>
  )
}
