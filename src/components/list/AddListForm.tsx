import { useEffect, useRef, useState } from 'react'

interface AddListFormProps {
  onAdd: (title: string) => void
  disabled?: boolean
}

export function AddListForm({ onAdd, disabled }: AddListFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submit()
    if (e.key === 'Escape') close()
  }

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setTitle('')
    inputRef.current?.focus()
  }

  function close() {
    setTitle('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          if (!disabled) setOpen(true)
        }}
        disabled={disabled}
        title={disabled ? 'Owner or admin access required' : undefined}
        className={`w-72 shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/20 text-white text-sm font-medium transition-colors${disabled ? ' opacity-50 cursor-not-allowed' : ' hover:bg-white/30'}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
        Add another list
      </button>
    )
  }

  return (
    <div className="w-72 shrink-0 rounded-xl bg-[#F1F2F4] dark:bg-zinc-800 p-2 flex flex-col gap-2">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter list title…"
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          Add list
        </button>
        <button
          onClick={close}
          aria-label="Cancel"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
