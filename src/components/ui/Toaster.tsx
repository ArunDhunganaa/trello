import { createPortal } from 'react-dom'
import { useToastStore } from '../../store/toastStore'
import { cn } from '../../lib/utils'

export function Toaster() {
  const { toasts, removeToast } = useToastStore()
  if (!toasts.length) return null

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 min-w-[240px] max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg',
            toast.variant === 'success' && 'bg-emerald-600',
            toast.variant === 'error' && 'bg-red-600',
            toast.variant === 'info' && 'bg-zinc-800'
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
