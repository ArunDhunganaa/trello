import { useEffect, useRef, useState } from 'react'
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
  canManage: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}

const LIST_COLORS = [
  { label: 'Default', value: null },
  { label: 'Red', value: '#FECECA' },
  { label: 'Orange', value: '#FCE5C5' },
  { label: 'Yellow', value: '#FEF3C7' },
  { label: 'Lime', value: '#D3F1A7' },
  { label: 'Green', value: '#C6F0D8' },
  { label: 'Blue', value: '#CCE0FF' },
  { label: 'Purple', value: '#DFD8FD' },
  { label: 'Pink', value: '#FDD0EC' },
  { label: 'Teal', value: '#C6EDFB' },
]

function getStoredColor(listId: string): string | null {
  try {
    return localStorage.getItem(`list-color-${listId}`)
  } catch {
    return null
  }
}
function setStoredColor(listId: string, color: string | null) {
  try {
    if (color) localStorage.setItem(`list-color-${listId}`, color)
    else localStorage.removeItem(`list-color-${listId}`)
  } catch {
    /* ignore */
  }
}

export function ListColumn({
  list,
  cards,
  onCardClick,
  canManage,
  collapsed,
  onToggleCollapse,
}: ListColumnProps) {
  const updateList = useListStore((s) => s.updateList)
  const deleteList = useListStore((s) => s.deleteList)
  const createCard = useCardStore((s) => s.createCard)

  const [addingCard, setAddingCard] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(list.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [listMenuOpen, setListMenuOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const listMenuRef = useRef<HTMLDivElement>(null)
  // Ref tracks showColorPicker without stale closure — used in handleOutside
  const colorPickerActiveRef = useRef(false)
  colorPickerActiveRef.current = showColorPicker

  const [listColor, setListColor] = useState<string | null>(() => getStoredColor(list.id))

  const bgColor = listColor ?? '#F1F2F4'

  const { setNodeRef } = useDroppable({ id: list.id })

  // Stable reference for SortableContext items — dnd-kit's useEffect fires on every
  // new array reference, causing an infinite setState loop. Recompute only when IDs change.
  const prevCardIdsRef = useRef<string[]>([])
  const nextCardIds = cards.map((c) => c.id)
  if (nextCardIds.join('\0') !== prevCardIdsRef.current.join('\0')) {
    prevCardIdsRef.current = nextCardIds
  }
  const cardIds = prevCardIdsRef.current

  useEffect(() => {
    if (!listMenuOpen) return
    function handleOutside(e: MouseEvent) {
      // Native color-picker dialog fires mousedown outside the menu — don't close while it's active
      if (colorPickerActiveRef.current) return
      if (listMenuRef.current && !listMenuRef.current.contains(e.target as Node)) {
        setListMenuOpen(false)
        setConfirmingDelete(false)
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [listMenuOpen])

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

  function handleColorChange(color: string | null) {
    setListColor(color)
    setStoredColor(list.id, color)
    setListMenuOpen(false)
    setShowColorPicker(false)
  }

  // ── Collapsed view ──────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          role="button"
          tabIndex={0}
          onClick={() => onToggleCollapse()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggleCollapse()
            }
          }}
          className="w-10 shrink-0 rounded-xl flex flex-col items-center py-2 gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trello-blue"
          style={{ backgroundColor: bgColor }}
          aria-label={`Expand list: ${list.title}`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse()
            }}
            aria-label="Expand list"
            className="rounded p-1 text-[#44546F] dark:text-zinc-400 hover:bg-black/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
          <span
            className="text-xs font-semibold text-[#172B4D] dark:text-zinc-200 select-none flex-1"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {list.title}
          </span>
          {cards.length > 0 && (
            <span className="text-[11px] font-semibold text-[#44546F] dark:text-zinc-400 mb-1">
              {cards.length}
            </span>
          )}
        </div>
      </SortableContext>
    )
  }

  // ── Expanded view ────────────────────────────────────────────────────────────
  return (
    <div
      className="w-72 shrink-0 max-h-full flex flex-col rounded-xl dark:bg-zinc-800"
      style={{ backgroundColor: bgColor }}
    >
      {/* List header */}
      <div className="flex items-center px-3 pt-2 pb-1 gap-1">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            aria-label="List title"
            className="flex-1 rounded border border-trello-blue bg-white dark:bg-zinc-900 px-2 py-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-trello-blue"
          />
        ) : (
          <button
            onClick={() => {
              setEditingTitle(true)
              setTimeout(() => titleInputRef.current?.select(), 0)
            }}
            className="flex-1 text-left text-sm font-semibold text-[#172B4D] dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-zinc-700 rounded px-2 py-0.5 transition-colors"
          >
            {list.title}
          </button>
        )}

        {/* Card count badge */}
        <span className="text-xs font-semibold text-[#44546F] dark:text-zinc-400 bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5 shrink-0 min-w-[1.25rem] text-center">
          {cards.length}
        </span>

        {/* Collapse button */}
        <button
          type="button"
          onClick={() => onToggleCollapse()}
          aria-label="Collapse list"
          title="Collapse list"
          className="rounded p-1 text-[#44546F] dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-zinc-700 hover:text-[#172B4D] dark:hover:text-zinc-200 transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* ⋯ list menu */}
        <div className="relative shrink-0" ref={listMenuRef}>
          <button
            onClick={() => {
              setListMenuOpen((v) => !v)
              setConfirmingDelete(false)
              setShowColorPicker(false)
            }}
            aria-label="List options"
            aria-expanded={listMenuOpen}
            aria-haspopup="true"
            className="rounded p-1 text-[#44546F] dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-zinc-700 hover:text-[#172B4D] dark:hover:text-zinc-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          {listMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-20 w-56 rounded-xl bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-center">
                  List actions
                </p>
              </div>

              {confirmingDelete ? (
                <div className="p-3">
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Delete this list?
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    All cards will be permanently removed.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        deleteList(list.id)
                        setListMenuOpen(false)
                      }}
                      className="flex-1 rounded bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="flex-1 rounded bg-zinc-100 dark:bg-zinc-700 px-2 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : showColorPicker ? (
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setShowColorPicker(false)}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors"
                      aria-label="Back"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                      </svg>
                    </button>
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      List color
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LIST_COLORS.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => handleColorChange(c.value)}
                        aria-label={c.label}
                        aria-pressed={listColor === c.value}
                        className="h-8 rounded-md border-2 transition-all hover:scale-105 flex items-center justify-center text-xs font-medium"
                        style={{
                          backgroundColor: c.value ?? '#F1F2F4',
                          borderColor: listColor === c.value ? '#579DFF' : 'transparent',
                        }}
                      >
                        {listColor === c.value && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="#579DFF"
                            aria-hidden="true"
                          >
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </button>
                    ))}
                    <label
                      aria-label="Custom color"
                      title="Custom color"
                      className="relative h-8 rounded-md border-2 cursor-pointer overflow-hidden transition-all hover:scale-105"
                      style={{
                        background:
                          listColor && !LIST_COLORS.some((c) => c.value === listColor)
                            ? listColor
                            : 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                        borderColor:
                          listColor && !LIST_COLORS.some((c) => c.value === listColor)
                            ? '#579DFF'
                            : 'transparent',
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span
                          className="text-white text-sm font-bold"
                          style={{ textShadow: '0 0 3px rgba(0,0,0,0.6)' }}
                        >
                          +
                        </span>
                      </span>
                      <input
                        type="color"
                        value={
                          listColor && !LIST_COLORS.some((c) => c.value === listColor)
                            ? listColor
                            : '#F1F2F4'
                        }
                        onChange={(e) => {
                          setListColor(e.target.value)
                          setStoredColor(list.id, e.target.value)
                        }}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setAddingCard(true)
                      setListMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-zinc-400 shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Add card
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => setShowColorPicker(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-zinc-400 shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                    </svg>
                    Change list color
                  </button>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-700" />
                  <button
                    role="menuitem"
                    onClick={() => {
                      if (canManage) setConfirmingDelete(true)
                    }}
                    disabled={!canManage}
                    title={!canManage ? 'Owner or admin access required' : undefined}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors${canManage ? ' text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : ' text-red-400 opacity-50 cursor-not-allowed'}`}
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
                    Delete list
                  </button>
                </>
              )}
            </div>
          )}
        </div>
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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-b-xl text-[#44546F] dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-zinc-700 hover:text-[#172B4D] dark:hover:text-zinc-200 text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Add a card
          </button>
        )}
      </div>
    </div>
  )
}
