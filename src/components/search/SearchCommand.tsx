import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

interface SearchResult {
  id: string
  title: string
  board_id: string
  board_title: string
}

interface CardRow {
  id: string
  title: string
  board_id: string
  boards: { title: string } | { title: string }[] | null
}

interface SearchCommandProps {
  open: boolean
  onClose: () => void
}

export function SearchCommand({ open, onClose }: SearchCommandProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('cards')
          .select('id, title, board_id, boards(title)')
          .ilike('title', `%${query}%`)
          .eq('is_archived', false)
          .limit(10)

        const rows = (data ?? []) as unknown as CardRow[]
        const mapped: SearchResult[] = rows.map((row) => {
          const b = row.boards
          const boardTitle = Array.isArray(b) ? b[0]?.title : b?.title
          return {
            id: row.id,
            title: row.title,
            board_id: row.board_id,
            board_title: boardTitle ?? 'Unknown board',
          }
        })
        setResults(mapped)
        setSelectedIndex(0)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(result: SearchResult) {
    navigate(`/board/${result.board_id}`)
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-zinc-400 shrink-0"
          >
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown')
                setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
              if (e.key === 'ArrowUp') setSelectedIndex((i) => Math.max(i - 1, 0))
              if (e.key === 'Enter' && results[selectedIndex]) handleSelect(results[selectedIndex])
            }}
            placeholder="Search cards…"
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-brand-500 rounded-full animate-spin shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border border-zinc-300 dark:border-zinc-600 px-1.5 text-xs text-zinc-400">
            Esc
          </kbd>
        </div>

        {results.length > 0 && (
          <ul className="max-h-64 overflow-y-auto py-2" role="listbox">
            {results.map((result, i) => (
              <li key={result.id} role="option" aria-selected={i === selectedIndex}>
                <button
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    'w-full flex flex-col items-start gap-0.5 px-4 py-2 text-left transition-colors',
                    i === selectedIndex
                      ? 'bg-zinc-100 dark:bg-zinc-800'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  )}
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate w-full">
                    {result.title}
                  </span>
                  <span className="text-xs text-zinc-400">{result.board_title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.trim() && !loading && results.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-6">No cards found for "{query}"</p>
        )}

        {!query.trim() && (
          <p className="text-xs text-zinc-400 text-center py-4">
            Type to search across all your cards
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}
