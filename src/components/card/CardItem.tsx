import type { CSSProperties } from 'react'
import type { Card } from '../../types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, getBoardBgStyle, getDueDateStatus } from '../../lib/utils'
import { useLabelStore } from '../../store/labelStore'

interface CardItemProps {
  card: Card
  onClick?: () => void
}

const DUE_DATE_STYLES: Record<string, string> = {
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'due-today': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'due-soon': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  upcoming: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

function CardVisual({ card }: { card: Card }) {
  const boardLabels = useLabelStore((s) => s.boardLabels)
  const cardLabelMap = useLabelStore((s) => s.cardLabelMap)
  const assignedIds = cardLabelMap[card.id] ?? []
  const cardLabels = boardLabels.filter((l) => assignedIds.includes(l.id))

  const dueDateStatus = getDueDateStatus(card.due_date)
  const dueDateLabel =
    dueDateStatus === 'overdue'
      ? 'Overdue'
      : dueDateStatus === 'due-today'
        ? 'Due today'
        : dueDateStatus === 'due-soon'
          ? 'Due soon'
          : null

  return (
    <div className="rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm hover:shadow-md transition-shadow">
      {card.cover_color && (
        <div
          className="h-8 rounded-t-lg"
          style={getBoardBgStyle(card.cover_color)}
          aria-hidden="true"
        />
      )}
      <div className="px-3 py-2">
        {cardLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {cardLabels.map((label) => (
              <span
                key={label.id}
                role="img"
                aria-label={label.name ?? label.color}
                style={{ backgroundColor: label.color }}
                className="h-2 w-8 rounded-full"
              />
            ))}
          </div>
        )}
        <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-snug break-words">
          {card.title}
        </p>
        {card.due_date && (
          <span
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 text-xs rounded px-1.5 py-0.5 font-medium',
              dueDateStatus ? DUE_DATE_STYLES[dueDateStatus] : 'text-zinc-500 dark:text-zinc-400'
            )}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
            </svg>
            {dueDateLabel
              ? `${dueDateLabel} · ${new Date(card.due_date.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
              : new Date(card.due_date.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
          </span>
        )}
      </div>
    </div>
  )
}

export function CardDragOverlay({ card }: { card: Card }) {
  return (
    <div className="rotate-1 cursor-grabbing shadow-2xl">
      <CardVisual card={card} />
    </div>
  )
}

export function CardItem({ card, onClick }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trello-blue focus-visible:rounded-lg',
        isDragging && 'opacity-0'
      )}
    >
      <CardVisual card={card} />
    </div>
  )
}
