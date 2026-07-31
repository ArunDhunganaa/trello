import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const TrelloBoardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="2" y="3" width="7" height="14" rx="1.5" />
    <rect x="13" y="3" width="9" height="9" rx="1.5" />
    <rect x="13" y="16" width="9" height="5" rx="1.5" />
  </svg>
)

export function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="h-14 bg-blue-600 text-white flex items-center px-4 gap-3 shadow-sm shrink-0">
      <Link
        to="/boards"
        className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-90 transition-opacity"
      >
        <TrelloBoardIcon />
        TaskFlow
      </Link>

      <div className="flex-1" />

      {user && (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-blue-800 text-sm font-semibold
                       flex items-center justify-center ring-2 ring-blue-300 shrink-0"
            title={user.email}
          >
            {initial}
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm font-medium text-white/90 hover:text-white px-3 py-1.5
                       rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
