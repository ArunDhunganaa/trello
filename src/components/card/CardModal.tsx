import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import type { Checklist, ChecklistItem } from '../../types'
import * as checklistService from '../../lib/checklistService'
import { useCardStore } from '../../store/cardStore'
import { useLabelStore } from '../../store/labelStore'
import { LabelPicker } from './LabelPicker'
import { CommentsSection } from './CommentsSection'
import { AttachmentsSection } from './AttachmentsSection'
import { cn, getBoardBgStyle, getDueDateStatus } from '../../lib/utils'

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1a1a1a' : '#ffffff'
}

const COVER_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
]

const COVER_IMAGES = [
  {
    thumb: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=160&h=80&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
    label: 'Gradient',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=160&h=80&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&q=80',
    label: 'Abstract',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=160&h=80&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=800&q=80',
    label: 'Space',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=160&h=80&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
    label: 'Night',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=160&h=80&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    label: 'Mountains',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=80&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    label: 'Beach',
  },
]

interface CardModalProps {
  cardId: string
  listName: string
  onClose: () => void
}

// ── Checklist sub-components ─────────────────────────────────────────────────

interface AddItemFormProps {
  onAdd: (title: string) => void
  onClose: () => void
}

function AddItemForm({ onAdd, onClose }: AddItemFormProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])

  function submit() {
    const t = value.trim()
    if (t) {
      onAdd(t)
      setValue('')
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
          if (e.key === 'Escape') onClose()
        }}
        aria-label="New checklist item"
        placeholder="Add an item"
        rows={2}
        className="w-full resize-none rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Add
        </button>
        <button
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

interface ChecklistSectionProps {
  checklist: Checklist
  onDelete: () => void
  onAddItem: (title: string) => void
  onToggleItem: (item: ChecklistItem) => void
  onDeleteItem: (itemId: string) => void
}

function ChecklistSection({
  checklist,
  onDelete,
  onAddItem,
  onToggleItem,
  onDeleteItem,
}: ChecklistSectionProps) {
  const [addingItem, setAddingItem] = useState(false)
  const items = checklist.items ?? []
  const doneCount = items.filter((i) => i.is_completed).length
  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold text-sm text-zinc-800 dark:text-zinc-200">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="shrink-0"
            aria-hidden="true"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          {checklist.title}
        </div>
        <button
          onClick={onDelete}
          aria-label={`Delete checklist: ${checklist.title}`}
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-zinc-500 w-7 text-right" aria-hidden="true">
          {pct}%
        </span>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${checklist.title} progress: ${pct}%`}
          className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden"
        >
          <div
            className={cn(
              'h-full rounded-full transition-all',
              pct === 100 ? 'bg-emerald-500' : 'bg-brand-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-1 mb-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <input
              type="checkbox"
              checked={item.is_completed}
              onChange={() => onToggleItem(item)}
              aria-label={item.title}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-brand-500"
            />
            <span
              className={cn(
                'flex-1 text-sm break-words',
                item.is_completed
                  ? 'line-through text-zinc-400 dark:text-zinc-500'
                  : 'text-zinc-800 dark:text-zinc-200'
              )}
            >
              {item.title}
            </span>
            <button
              onClick={() => onDeleteItem(item.id)}
              aria-label={`Delete item: ${item.title}`}
              className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {addingItem ? (
        <AddItemForm
          onAdd={(t) => {
            onAddItem(t)
            setAddingItem(false)
          }}
          onClose={() => setAddingItem(false)}
        />
      ) : (
        <button
          onClick={() => setAddingItem(true)}
          className="rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Add an item
        </button>
      )}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function CardModal({ cardId, listName, onClose }: CardModalProps) {
  const card = useCardStore((s) => s.cards.find((c) => c.id === cardId))
  const updateCard = useCardStore((s) => s.updateCard)
  const deleteCard = useCardStore((s) => s.deleteCard)

  const boardLabels = useLabelStore((s) => s.boardLabels)
  const cardLabelMap = useLabelStore((s) => s.cardLabelMap)
  const assignedIds = cardLabelMap[cardId] ?? []
  const cardLabels = boardLabels.filter((l) => assignedIds.includes(l.id))

  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(card?.title ?? '')
  const [editingDesc, setEditingDesc] = useState(false)
  const [draftDesc, setDraftDesc] = useState(card?.description ?? '')
  const [addingChecklist, setAddingChecklist] = useState(false)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [showCoverUrlInput, setShowCoverUrlInput] = useState(false)

  const titleRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    el.addEventListener('keydown', trap)
    first?.focus()
    return () => el.removeEventListener('keydown', trap)
  }, [])

  useEffect(() => {
    if (card) {
      setDraftTitle(card.title)
      setDraftDesc(card.description ?? '')
    }
  }, [card?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    checklistService
      .fetchChecklists(cardId)
      .then(setChecklists)
      .catch(() => {})
  }, [cardId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!card) return null

  // ── Title ──
  function saveTitle() {
    const t = draftTitle.trim()
    if (t && t !== card!.title) updateCard(card!.id, { title: t })
    else setDraftTitle(card!.title)
    setEditingTitle(false)
  }

  // ── Description ──
  function saveDesc() {
    const d = draftDesc.trim()
    const current = card!.description ?? ''
    if (d !== current) updateCard(card!.id, { description: d || null })
    setEditingDesc(false)
  }

  // ── Due date ──
  function handleDueDate(e: React.ChangeEvent<HTMLInputElement>) {
    updateCard(card!.id, { due_date: e.target.value || null })
  }

  // ── Cover color ──
  function pickCover(color: string | null) {
    updateCard(card!.id, { cover_color: color })
  }

  // ── Checklists ──
  async function handleAddChecklist() {
    const title = newChecklistTitle.trim() || 'Checklist'
    const lastPos = checklists.at(-1)?.position ?? null
    const cl = await checklistService.createChecklist(card!.id, title, lastPos)
    setChecklists((prev) => [...prev, cl])
    setNewChecklistTitle('')
    setAddingChecklist(false)
  }

  function handleDeleteChecklist(clId: string) {
    checklistService.deleteChecklist(clId).catch(() => {})
    setChecklists((prev) => prev.filter((cl) => cl.id !== clId))
  }

  function handleAddItem(clId: string, title: string) {
    const cl = checklists.find((c) => c.id === clId)!
    const lastPos = cl.items?.at(-1)?.position ?? null
    checklistService.createChecklistItem(clId, title, lastPos).then((item) => {
      setChecklists((prev) =>
        prev.map((c) => (c.id === clId ? { ...c, items: [...(c.items ?? []), item] } : c))
      )
    })
  }

  function handleToggleItem(clId: string, item: ChecklistItem) {
    checklistService
      .updateChecklistItem(item.id, { is_completed: !item.is_completed })
      .then((updated) => {
        setChecklists((prev) =>
          prev.map((c) =>
            c.id === clId
              ? { ...c, items: (c.items ?? []).map((i) => (i.id === updated.id ? updated : i)) }
              : c
          )
        )
      })
  }

  function handleDeleteItem(clId: string, itemId: string) {
    checklistService.deleteChecklistItem(itemId).catch(() => {})
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === clId ? { ...c, items: (c.items ?? []).filter((i) => i.id !== itemId) } : c
      )
    )
  }

  function handleDeleteCard() {
    deleteCard(card!.id)
    onClose()
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const dueDateValue = card.due_date ? card.due_date.slice(0, 10) : ''
  const dueDateDisplay = card.due_date
    ? new Date(card.due_date.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const dueDateStatus = getDueDateStatus(card.due_date)
  const dueDateStatusLabel: Record<string, string> = {
    overdue: 'Overdue',
    'due-today': 'Due today',
    'due-soon': 'Due soon',
    upcoming: 'Upcoming',
  }
  const dueDateColor: Record<string, string> = {
    overdue: 'text-red-600 dark:text-red-400',
    'due-today': 'text-orange-600 dark:text-orange-400',
    'due-soon': 'text-yellow-600 dark:text-yellow-400',
    upcoming: 'text-emerald-600 dark:text-emerald-400',
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Card details"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl mx-4 mb-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover strip */}
        {card.cover_color && (
          <div
            className="h-28 rounded-t-xl"
            style={getBoardBgStyle(card.cover_color)}
            aria-hidden="true"
          />
        )}

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className={cn(
            'absolute right-3 rounded-full p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors',
            card.cover_color ? 'top-3 text-white/80 hover:bg-black/20 hover:text-white' : 'top-3'
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        {/* Body grid */}
        <div className="grid grid-cols-[1fr_180px] gap-4 p-4 pt-3">
          {/* ── Left column ─────────────────────────────── */}
          <div className="flex flex-col gap-6 min-w-0">
            {/* Title */}
            <div>
              {editingTitle ? (
                <textarea
                  ref={titleRef}
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      saveTitle()
                    }
                    if (e.key === 'Escape') {
                      setDraftTitle(card.title)
                      setEditingTitle(false)
                    }
                  }}
                  autoFocus
                  aria-label="Card title"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-brand-500 bg-white dark:bg-zinc-800 px-3 py-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingTitle(true)
                    setTimeout(() => titleRef.current?.select(), 0)
                  }}
                  className="w-full text-left text-lg font-semibold text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  {card.title}
                </button>
              )}
              <p className="px-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                in list <span className="font-medium">{listName}</span>
              </p>
            </div>

            {/* Label chips */}
            {cardLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1 -mt-3">
                {cardLabels.map((label) => (
                  <span
                    key={label.id}
                    style={{ backgroundColor: label.color, color: getContrastColor(label.color) }}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  >
                    {label.name ?? ''}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-zinc-500"
                  aria-hidden="true"
                >
                  <path d="M3 5h18v2H3zm0 4h18v2H3zm0 4h12v2H3z" />
                </svg>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Description
                </h3>
              </div>

              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    aria-label="Card description"
                    rows={5}
                    autoFocus
                    placeholder="Add a more detailed description…"
                    className="w-full resize-none rounded-lg border border-brand-500 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveDesc}
                      className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setDraftDesc(card.description ?? '')
                        setEditingDesc(false)
                      }}
                      className="rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingDesc(true)}
                  className="w-full text-left rounded-lg px-3 py-2 min-h-[72px] bg-zinc-200 dark:bg-zinc-700/60 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  {card.description ? (
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {card.description}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400">Add a more detailed description…</p>
                  )}
                </button>
              )}
            </div>

            {/* Checklists */}
            {checklists.map((cl) => (
              <ChecklistSection
                key={cl.id}
                checklist={cl}
                onDelete={() => handleDeleteChecklist(cl.id)}
                onAddItem={(title) => handleAddItem(cl.id, title)}
                onToggleItem={(item) => handleToggleItem(cl.id, item)}
                onDeleteItem={(itemId) => handleDeleteItem(cl.id, itemId)}
              />
            ))}

            {/* Add checklist form */}
            {addingChecklist ? (
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAddChecklist()
                    if (e.key === 'Escape') setAddingChecklist(false)
                  }}
                  aria-label="Checklist title"
                  placeholder="Checklist title"
                  className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleAddChecklist()}
                    className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingChecklist(false)}
                    className="rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {/* Attachments */}
            <AttachmentsSection cardId={card.id} boardId={card.board_id} />

            {/* Activity / Comments */}
            <CommentsSection cardId={card.id} />
          </div>

          {/* ── Sidebar ─────────────────────────────────── */}
          <div className="flex flex-col gap-1 pt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
              Add to card
            </p>

            {/* Labels */}
            <div className="relative">
              <button
                onClick={() => setShowLabelPicker((v) => !v)}
                aria-expanded={showLabelPicker}
                aria-haspopup="dialog"
                className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" />
                </svg>
                Labels
              </button>
              {showLabelPicker && (
                <div className="absolute right-0 top-full mt-1 z-10 w-52">
                  <LabelPicker
                    cardId={card.id}
                    boardId={card.board_id}
                    onClose={() => setShowLabelPicker(false)}
                  />
                </div>
              )}
            </div>

            {/* Checklist button */}
            <button
              onClick={() => setAddingChecklist(true)}
              className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Checklist
            </button>

            {/* Due date */}
            <div className="mt-2">
              <label
                htmlFor="card-due-date"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block"
              >
                Due date
              </label>
              <input
                id="card-due-date"
                type="date"
                value={dueDateValue}
                min={todayStr}
                onChange={handleDueDate}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {dueDateStatus && (
                <p className={cn('text-xs mt-1 font-medium', dueDateColor[dueDateStatus])}>
                  {dueDateStatusLabel[dueDateStatus]} · {dueDateDisplay}
                </p>
              )}
              {dueDateValue && (
                <button
                  onClick={() => updateCard(card.id, { due_date: null })}
                  className="mt-1 w-full text-xs rounded px-2 py-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Remove due date
                </button>
              )}
            </div>

            {/* Cover */}
            <div className="mt-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Cover</p>
              <div className="grid grid-cols-4 gap-1">
                {COVER_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      pickCover(color)
                      setShowCoverUrlInput(false)
                    }}
                    aria-label={`Cover color: ${color}`}
                    aria-pressed={card.cover_color === color}
                    style={{ backgroundColor: color }}
                    className={cn(
                      'h-6 w-full rounded transition-transform hover:scale-110',
                      card.cover_color === color &&
                        'ring-2 ring-offset-1 ring-brand-500 dark:ring-offset-zinc-900'
                    )}
                  />
                ))}
                <label
                  aria-label="Custom color"
                  title="Custom color"
                  className={cn(
                    'relative h-6 w-full rounded cursor-pointer overflow-hidden hover:scale-110 transition-transform',
                    card.cover_color?.startsWith('#') &&
                      !COVER_COLORS.includes(card.cover_color) &&
                      'ring-2 ring-offset-1 ring-brand-500 dark:ring-offset-zinc-900'
                  )}
                  style={{
                    background:
                      card.cover_color?.startsWith('#') && !COVER_COLORS.includes(card.cover_color)
                        ? card.cover_color
                        : 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
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
                      card.cover_color?.startsWith('#') && !COVER_COLORS.includes(card.cover_color)
                        ? card.cover_color
                        : '#ef4444'
                    }
                    onChange={(e) => {
                      pickCover(e.target.value)
                      setShowCoverUrlInput(false)
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>

              {/* Preset images */}
              <div className="mt-1.5">
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">Images</p>
                <div className="grid grid-cols-3 gap-1">
                  {COVER_IMAGES.map((img) => (
                    <button
                      key={img.full}
                      onClick={() => {
                        pickCover(img.full)
                        setShowCoverUrlInput(false)
                      }}
                      title={img.label}
                      aria-label={`Cover image: ${img.label}`}
                      aria-pressed={card.cover_color === img.full}
                      className={cn(
                        'h-7 rounded bg-zinc-200 dark:bg-zinc-700 ring-offset-1 transition-all hover:scale-110',
                        card.cover_color === img.full &&
                          'ring-2 ring-offset-1 ring-brand-500 dark:ring-offset-zinc-900'
                      )}
                      style={{
                        backgroundImage: `url(${img.thumb})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Custom URL toggle */}
              <button
                onClick={() => setShowCoverUrlInput((v) => !v)}
                className="mt-1.5 w-full text-xs rounded px-2 py-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M21 3H3C2 3 1 4 1 5v14c0 1.1.9 2 2 2h18c1 0 2-1 2-2V5c0-1-1-2-2-2zm0 16H3V5h18v14zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
                Custom URL
              </button>

              {showCoverUrlInput && (
                <div className="mt-1 flex gap-1">
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://…"
                    className="flex-1 min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    onClick={() => {
                      if (coverImageUrl.trim()) {
                        pickCover(coverImageUrl.trim())
                        setCoverImageUrl('')
                        setShowCoverUrlInput(false)
                      }
                    }}
                    className="rounded bg-brand-500 px-2 py-1 text-xs text-white hover:bg-brand-600 transition-colors"
                  >
                    Set
                  </button>
                </div>
              )}

              {card.cover_color && (
                <button
                  onClick={() => pickCover(null)}
                  className="mt-1.5 w-full text-xs rounded px-2 py-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Remove cover
                </button>
              )}
            </div>

            {/* Actions */}
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mt-4 mb-1">
              Actions
            </p>
            <button
              onClick={handleDeleteCard}
              className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-zinc-200 dark:bg-zinc-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              Delete card
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
