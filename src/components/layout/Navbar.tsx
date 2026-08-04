import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { SearchCommand } from '../search/SearchCommand'

interface NavbarProps {
  onCreateBoard?: () => void
}

export function Navbar({ onCreateBoard }: NavbarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const initial = user?.email?.[0]?.toUpperCase() ?? '?'

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!userMenuOpen) return
    function handleOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [userMenuOpen])

  return (
    <>
      <header className="h-12 bg-navy-dark text-white flex items-center px-3 gap-1 shrink-0 border-b border-white/10">
        {/* Logo */}
        <Link
          to="/boards"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-white/10 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#579DFF" aria-hidden="true">
            <rect x="2" y="3" width="7" height="14" rx="1.5" />
            <rect x="13" y="3" width="9" height="9" rx="1.5" />
            <rect x="13" y="16" width="9" height="5" rx="1.5" />
          </svg>
          <span className="font-bold text-[15px] text-white">Trello</span>
        </Link>

        {/* Create button — only rendered when a create handler is wired up */}
        {onCreateBoard && (
          <button
            type="button"
            onClick={onCreateBoard}
            className="flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded bg-trello-blue hover:bg-trello-blue-hover text-white text-sm font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            Create
          </button>
        )}

        <div className="flex-1" />

        {user && (
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search cards (⌘K)"
              className="flex items-center gap-2 rounded px-3 py-1.5 text-sm text-trello-text hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <span className="hidden sm:block">Search</span>
              <kbd className="hidden md:inline-flex items-center rounded border border-white/20 px-1 text-xs text-white/50">
                ⌘K
              </kbd>
            </button>

            {/* Avatar dropdown */}
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label={`User menu for ${user.email ?? 'account'}`}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                className="w-8 h-8 rounded-full bg-trello-blue text-sm font-semibold text-white flex items-center justify-center hover:ring-2 hover:ring-white/40 transition-all shrink-0"
              >
                {initial}
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg bg-navy-surface shadow-2xl border border-white/10 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-[11px] font-semibold text-trello-text uppercase tracking-wide">
                      Account
                    </p>
                    <p className="text-sm text-white mt-0.5 truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void logout()}
                    className="w-full text-left px-4 py-2.5 text-sm text-trello-text hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
