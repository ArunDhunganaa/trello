import { useState, useEffect } from 'react'
import type { Comment } from '../../types'
import * as commentService from '../../lib/commentService'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface CommentsSectionProps {
  cardId: string
}

export function CommentsSection({ cardId }: CommentsSectionProps) {
  const user = useAuthStore((s) => s.user)
  const [comments, setComments] = useState<Comment[]>([])
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    commentService
      .fetchComments(cardId)
      .then(setComments)
      .catch((err) => {
        console.error('Failed to load comments:', err)
      })
  }, [cardId])

  async function handleSubmit() {
    const body = draft.trim()
    if (!body || !user || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const comment = await commentService.createComment(cardId, user.id, body)
      setComments((prev) => [...prev, comment])
      setDraft('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not post comment'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveEdit(commentId: string) {
    const body = editText.trim()
    if (!body) return
    try {
      const updated = await commentService.updateComment(commentId, body)
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
      setEditingId(null)
    } catch {
      // keep editing open on error
    }
  }

  function handleDelete(commentId: string) {
    commentService.deleteComment(commentId).catch(() => {})
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-zinc-500 shrink-0"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Activity</h3>
      </div>

      {/* Add comment */}
      <div className="flex flex-col gap-2 mb-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          placeholder="Write a comment… (⌘Enter to save)"
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {draft.trim() && (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setDraft('')
                  setSubmitError(null)
                }}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
            {submitError && <p className="text-xs text-red-500 dark:text-red-400">{submitError}</p>}
          </div>
        )}
      </div>

      {/* Comment list */}
      <div className="flex flex-col gap-3">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {(c.author_username ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {c.author_username}
                </span>
                <span className="text-xs text-zinc-400">{relativeTime(c.created_at)}</span>
              </div>

              {editingId === c.id ? (
                <div className="flex flex-col gap-2 mt-1">
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        void handleSaveEdit(c.id)
                      }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    rows={2}
                    className="w-full resize-none rounded border border-brand-500 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleSaveEdit(c.id)}
                      className="rounded bg-brand-500 px-3 py-1 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    'text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mt-0.5'
                  )}
                >
                  {c.body}
                </p>
              )}

              {user?.id === c.user_id && editingId !== c.id && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      setEditingId(c.id)
                      setEditText(c.body)
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline transition-colors"
                  >
                    Edit
                  </button>
                  <span className="text-xs text-zinc-300" aria-hidden="true">
                    ·
                  </span>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-zinc-400 hover:text-red-500 underline transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
