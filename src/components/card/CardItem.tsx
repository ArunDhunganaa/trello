import type { CSSProperties } from 'react'
import type { Card } from '../../types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../../lib/utils'

interface CardItemProps {
  card: Card
  onClick?: () => void
}

function CardVisual({ card }: { card: Card }) {
  return (
    <div className="rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm hover:shadow-md transition-shadow">
      {card.cover_color && (
        <div
          className="h-8 rounded-t-lg"
          style={{ backgroundColor: card.cover_color }}
          aria-hidden="true"
        />
      )}
      <div className="px-3 py-2">
        <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-snug break-words">
          {card.title}
        </p>
        {card.due_date && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
            </svg>
            {new Date(card.due_date).toLocaleDateString(undefined, {
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
      className={cn('cursor-grab active:cursor-grabbing', isDragging && 'opacity-0')}
    >
      <CardVisual card={card} />
    </div>
  )
}
