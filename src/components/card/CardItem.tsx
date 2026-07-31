import type { Card } from '../../types'

interface CardItemProps {
  card: Card
  onClick?: () => void
}

export function CardItem({ card, onClick }: CardItemProps) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-lg bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md border border-zinc-200/60 dark:border-zinc-700/60 cursor-pointer transition-shadow"
    >
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
