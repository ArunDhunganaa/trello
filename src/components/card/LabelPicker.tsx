import { useState } from 'react'
import { useLabelStore } from '../../store/labelStore'
import { cn } from '../../lib/utils'

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#64748b',
  '#a16207',
]

interface LabelPickerProps {
  cardId: string
  boardId: string
  onClose: () => void
}

export function LabelPicker({ cardId, boardId, onClose }: LabelPickerProps) {
  const boardLabels = useLabelStore((s) => s.boardLabels)
  const cardLabelMap = useLabelStore((s) => s.cardLabelMap)
  const toggleLabel = useLabelStore((s) => s.toggleLabel)
  const createLabel = useLabelStore((s) => s.createLabel)
  const deleteLabel = useLabelStore((s) => s.deleteLabel)

  const assignedIds = cardLabelMap[cardId] ?? []

  const [creating, setCreating] = useState(false)
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (saving) return
    setSaving(true)
    try {
      await createLabel(boardId, newColor, newName || undefined)
      setNewName('')
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl p-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Labels
        </span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          aria-label="Close label picker"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      {boardLabels.length === 0 && !creating && (
        <p className="text-xs text-zinc-400 text-center py-2">No labels yet</p>
      )}

      <div className="flex flex-col gap-1 mb-2">
        {boardLabels.map((label) => {
          const isOn = assignedIds.includes(label.id)
          return (
            <div key={label.id} className="flex items-center gap-1.5">
              <button
                onClick={() => toggleLabel(cardId, label.id)}
                className={cn(
                  'flex-1 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-white transition-opacity',
                  isOn ? 'opacity-100' : 'opacity-55 hover:opacity-85'
                )}
                style={{ backgroundColor: label.color }}
              >
                {isOn && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="shrink-0"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
                <span className="truncate">{label.name ?? label.color}</span>
              </button>
              <button
                onClick={() => deleteLabel(label.id)}
                aria-label="Delete label"
                className="shrink-0 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {creating ? (
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Label name (optional)"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
                className={cn(
                  'w-5 h-5 rounded transition-transform hover:scale-110',
                  newColor === c && 'ring-2 ring-offset-1 ring-brand-500 dark:ring-offset-zinc-800'
                )}
              />
            ))}
            <label
              aria-label="Custom color"
              title="Custom color"
              className={cn(
                'relative w-5 h-5 rounded cursor-pointer overflow-hidden hover:scale-110 transition-transform',
                !PRESET_COLORS.includes(newColor) &&
                  'ring-2 ring-offset-1 ring-brand-500 dark:ring-offset-zinc-800'
              )}
              style={{
                background: !PRESET_COLORS.includes(newColor)
                  ? newColor
                  : 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
              }}
            >
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleCreate()}
              disabled={saving}
              className="flex-1 rounded bg-brand-500 px-2 py-1 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="flex-1 rounded px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
        >
          + Create label
        </button>
      )}
    </div>
  )
}
