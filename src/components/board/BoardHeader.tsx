import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Board, BoardMember } from '../../types'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useLabelStore } from '../../store/labelStore'
import { useToast } from '../../store/toastStore'
import * as boardMemberService from '../../lib/boardMemberService'
import { cn, getBoardBgStyle } from '../../lib/utils'
import { BOARD_COLORS, BOARD_IMAGES } from './CreateBoardModal'

interface BoardHeaderProps {
  board: Board
  members: BoardMember[]
  setMembers: React.Dispatch<React.SetStateAction<BoardMember[]>>
  canManage: boolean
  allCollapsed: boolean
  onCollapseAll: () => void
  onExpandAll: () => void
}

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' }

function avatarInitial(member: BoardMember): string {
  return (member.profile?.username ?? '?')[0].toUpperCase()
}

type MenuPanel = 'main' | 'background' | 'labels' | 'members' | 'confirm-close'

export function BoardHeader({
  board,
  members,
  setMembers,
  canManage,
  allCollapsed,
  onCollapseAll,
  onExpandAll,
}: BoardHeaderProps) {
  const toggleStar = useBoardStore((s) => s.toggleStar)
  const updateBoard = useBoardStore((s) => s.updateBoard)
  const currentUser = useAuthStore((s) => s.user)
  const boardLabels = useLabelStore((s) => s.boardLabels)
  const createLabel = useLabelStore((s) => s.createLabel)
  const deleteLabel = useLabelStore((s) => s.deleteLabel)
  const { toast } = useToast()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(board.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)
  const inviteRef = useRef<HTMLDivElement>(null)
  const inviteInputRef = useRef<HTMLInputElement>(null)

  const [showBoardMenu, setShowBoardMenu] = useState(false)
  const [menuPanel, setMenuPanel] = useState<MenuPanel>('main')
  const boardMenuRef = useRef<HTMLDivElement>(null)

  // Background panel state
  type BgTab = 'color' | 'image'
  const [bgTab, setBgTab] = useState<BgTab>('color')
  const [bgColor, setBgColor] = useState(
    board.background.startsWith('http') ? BOARD_COLORS[0].value : board.background
  )
  const [bgImageUrl, setBgImageUrl] = useState(
    board.background.startsWith('http') ? board.background : ''
  )

  // Labels panel state
  const LABEL_COLORS = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
  ]
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0])
  const [newLabelName, setNewLabelName] = useState('')
  const [creatingLabel, setCreatingLabel] = useState(false)

  useEffect(() => {
    if (!showInvite) return
    setTimeout(() => inviteInputRef.current?.focus(), 50)
    function handleClickOutside(e: MouseEvent) {
      if (inviteRef.current && !inviteRef.current.contains(e.target as Node)) {
        setShowInvite(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showInvite])

  useEffect(() => {
    if (!showBoardMenu) return
    function handleClickOutside(e: MouseEvent) {
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) {
        setShowBoardMenu(false)
        setMenuPanel('main')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showBoardMenu])

  async function handleCloseBoard() {
    await updateBoard(board.id, { is_archived: true })
    navigate('/boards')
  }

  async function handleReopenBoard() {
    await updateBoard(board.id, { is_archived: false })
    setShowBoardMenu(false)
  }

  function startEdit() {
    setDraft(board.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const title = draft.trim()
    if (title && title !== board.title) {
      void updateBoard(board.id, { title })
    } else {
      setDraft(board.title)
    }
    setEditing(false)
  }

  async function handleInvite() {
    const email = inviteEmail.trim()
    if (!email) return
    setInviting(true)
    try {
      const profile = await boardMemberService.findProfileByEmail(email)
      if (!profile) {
        toast('No account found with that email. They may need to sign up first.', 'error')
        return
      }
      const alreadyMember = members.some((m) => m.user_id === profile.id)
      if (alreadyMember) {
        toast('That person is already a member', 'info')
        return
      }
      await boardMemberService.addMember(board.id, profile.id, inviteRole)
      const updated = await boardMemberService.fetchMembers(board.id)
      setMembers(updated)
      setInviteEmail('')
      setInviteRole('member')
      setShowInvite(false)
      toast(`${profile.username} added to board`, 'success')
    } catch {
      toast('Could not add member — you may need owner/admin role', 'error')
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(member: BoardMember, newRole: 'admin' | 'member') {
    try {
      await boardMemberService.updateMemberRole(board.id, member.user_id, newRole)
      setMembers((prev) =>
        prev.map((m) => (m.user_id === member.user_id ? { ...m, role: newRole } : m))
      )
    } catch {
      toast('Could not update role', 'error')
    }
  }

  async function handleRemoveMember(member: BoardMember) {
    try {
      await boardMemberService.removeMember(board.id, member.user_id)
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id))
    } catch {
      toast('Could not remove member', 'error')
    }
  }

  function applyBackground() {
    const newBg = bgTab === 'image' && bgImageUrl.trim() ? bgImageUrl.trim() : bgColor
    void updateBoard(board.id, { background: newBg })
    setMenuPanel('main')
  }

  async function handleCreateLabel() {
    if (!newLabelColor) return
    setCreatingLabel(true)
    try {
      await createLabel(board.id, newLabelColor, newLabelName.trim() || undefined)
      setNewLabelName('')
    } finally {
      setCreatingLabel(false)
    }
  }

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-black/20 backdrop-blur-sm">
      <Link
        to="/boards"
        className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium transition-colors"
        aria-label="Back to boards"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        Boards
      </Link>

      <div className="w-px h-5 bg-white/30" aria-hidden="true" />

      {canManage && editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') {
              setDraft(board.title)
              setEditing(false)
            }
          }}
          aria-label="Board title"
          className="rounded px-2 py-0.5 text-sm font-semibold bg-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 w-40 min-w-0"
        />
      ) : canManage ? (
        <button
          onClick={startEdit}
          aria-label={`Edit board title: ${board.title}`}
          className="text-white font-semibold text-sm rounded px-2 py-0.5 hover:bg-white/20 transition-colors"
        >
          {board.title}
        </button>
      ) : (
        <span className="text-white font-semibold text-sm px-2 py-0.5">{board.title}</span>
      )}

      <button
        onClick={() => void toggleStar(board.id)}
        aria-label={board.is_starred ? 'Unstar board' : 'Star board'}
        className="text-white/70 hover:text-white transition-colors"
      >
        {board.is_starred ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        )}
      </button>

      <div className="w-px h-5 bg-white/30" aria-hidden="true" />

      {/* Invite popover */}
      <div className="relative" ref={inviteRef}>
        <button
          onClick={() => {
            if (canManage) setShowInvite((v) => !v)
          }}
          disabled={!canManage}
          title={!canManage ? 'Owner or admin access required' : undefined}
          aria-expanded={showInvite}
          aria-haspopup="dialog"
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-white/90 transition-colors',
            canManage ? 'hover:bg-white/20' : 'opacity-50 cursor-not-allowed'
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          Invite
        </button>

        {showInvite && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Invite member"
            className="absolute left-0 top-full mt-1 z-20 w-64 rounded-xl bg-white dark:bg-zinc-800 shadow-xl p-3 flex flex-col gap-2"
          >
            <label
              htmlFor="invite-email"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400"
            >
              Invite by email
            </label>
            <input
              id="invite-email"
              ref={inviteInputRef}
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleInvite()
                if (e.key === 'Escape') setShowInvite(false)
              }}
              placeholder="name@email.com"
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex gap-2">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                aria-label="Role"
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => void handleInvite()}
                disabled={inviting || !inviteEmail.trim()}
                className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                {inviting ? 'Inviting…' : 'Invite'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto" />

      {/* Board menu */}
      <div className="relative" ref={boardMenuRef}>
        <button
          onClick={() => {
            setShowBoardMenu((v) => !v)
            setMenuPanel('main')
          }}
          aria-label="Board menu"
          aria-expanded={showBoardMenu}
          aria-haspopup="true"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-white/90 hover:bg-white/20 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
          Menu
        </button>

        {showBoardMenu && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-20 w-60 rounded-xl bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
          >
            {/* ── Main panel ── */}
            {menuPanel === 'main' && (
              <>
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-center">
                    Board actions
                  </p>
                </div>

                {/* Change Background */}
                <button
                  role="menuitem"
                  onClick={() => {
                    if (canManage) setMenuPanel('background')
                  }}
                  disabled={!canManage}
                  title={!canManage ? 'Owner or admin access required' : undefined}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 transition-colors text-left',
                    canManage
                      ? 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
                      : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-zinc-400 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M21 3H3C2 3 1 4 1 5v14c0 1.1.9 2 2 2h18c1 0 2-1 2-2V5c0-1-1-2-2-2zm0 16H3V5h18v14zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                  Change background
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ml-auto text-zinc-400"
                    aria-hidden="true"
                  >
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>

                <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

                {/* Labels */}
                <button
                  role="menuitem"
                  onClick={() => setMenuPanel('labels')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-zinc-400 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" />
                  </svg>
                  Labels
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ml-auto text-zinc-400"
                    aria-hidden="true"
                  >
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>

                <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

                {/* Members */}
                <button
                  role="menuitem"
                  onClick={() => setMenuPanel('members')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-zinc-400 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                  Members
                  <span className="ml-auto text-xs text-zinc-400">{members.length}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-zinc-400"
                    aria-hidden="true"
                  >
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>

                <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

                {/* Collapse / Expand all lists */}
                <button
                  role="menuitem"
                  onClick={() => {
                    allCollapsed ? onExpandAll() : onCollapseAll()
                    setShowBoardMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-zinc-400 shrink-0"
                    aria-hidden="true"
                  >
                    {allCollapsed ? (
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    ) : (
                      <path d="M14 6l-1.41 1.41L16.17 11H4v2h12.17l-3.58 3.59L14 18l6-6z" />
                    )}
                  </svg>
                  {allCollapsed ? 'Expand all lists' : 'Collapse all lists'}
                </button>

                <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

                {/* Star */}
                {!board.is_archived && (
                  <>
                    <button
                      role="menuitem"
                      onClick={() => {
                        void toggleStar(board.id)
                        setShowBoardMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                    >
                      {board.is_starred ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="text-yellow-400 shrink-0"
                        >
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-zinc-400 shrink-0"
                        >
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      )}
                      {board.is_starred ? 'Unstar board' : 'Star board'}
                    </button>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-700" />
                  </>
                )}

                {/* Close / Reopen */}
                {board.is_archived ? (
                  <button
                    role="menuitem"
                    onClick={() => {
                      if (canManage) void handleReopenBoard()
                    }}
                    disabled={!canManage}
                    title={!canManage ? 'Owner or admin access required' : undefined}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 transition-colors text-left',
                      canManage
                        ? 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
                        : 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-zinc-400 shrink-0"
                    >
                      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18z" />
                    </svg>
                    Reopen board
                  </button>
                ) : (
                  <button
                    role="menuitem"
                    onClick={() => {
                      if (canManage) setMenuPanel('confirm-close')
                    }}
                    disabled={!canManage}
                    title={!canManage ? 'Owner or admin access required' : undefined}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 transition-colors text-left',
                      canManage
                        ? 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
                        : 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-zinc-400 shrink-0"
                    >
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                    Close board
                  </button>
                )}
              </>
            )}

            {/* ── Change Background panel ── */}
            {menuPanel === 'background' && (
              <div>
                <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                  <button
                    onClick={() => setMenuPanel('main')}
                    className="p-0.5 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    aria-label="Back"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                  </button>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex-1 text-center">
                    Change background
                  </p>
                </div>
                <div className="p-3 flex flex-col gap-3">
                  {/* Tab switcher */}
                  <div className="flex gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-700 rounded-lg w-fit">
                    {(['color', 'image'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setBgTab(tab)}
                        className={cn(
                          'px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                          bgTab === tab
                            ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {bgTab === 'color' ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {BOARD_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setBgColor(c.value)}
                          aria-label={c.label}
                          aria-pressed={bgColor === c.value}
                          className={cn(
                            'h-8 w-full rounded-lg transition-all hover:scale-105',
                            bgColor === c.value && 'ring-2 ring-offset-1 ring-brand-500'
                          )}
                          style={{ backgroundColor: c.value }}
                        />
                      ))}
                      <label
                        aria-label="Custom color"
                        title="Custom color"
                        className={cn(
                          'relative h-8 w-full rounded-lg cursor-pointer overflow-hidden hover:scale-105 transition-all',
                          !BOARD_COLORS.some(
                            (c) => c.value.toLowerCase() === bgColor.toLowerCase()
                          ) && 'ring-2 ring-offset-1 ring-brand-500'
                        )}
                        style={{
                          background: !BOARD_COLORS.some(
                            (c) => c.value.toLowerCase() === bgColor.toLowerCase()
                          )
                            ? bgColor
                            : 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                        }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span
                            className="text-white text-sm font-bold"
                            style={{ textShadow: '0 0 3px rgba(0,0,0,0.6)' }}
                          >
                            +
                          </span>
                        </span>
                        <input
                          type="color"
                          value={bgColor.toLowerCase()}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        {BOARD_IMAGES.map((img) => (
                          <button
                            key={img.full}
                            type="button"
                            onClick={() => setBgImageUrl(img.full)}
                            title={img.label}
                            aria-label={img.label}
                            aria-pressed={bgImageUrl === img.full}
                            className={cn(
                              'h-9 rounded-lg bg-zinc-200 dark:bg-zinc-700 ring-offset-1 transition-all hover:scale-105 focus:outline-none',
                              bgImageUrl === img.full && 'ring-2 ring-offset-1 ring-brand-500'
                            )}
                            style={{
                              backgroundImage: `url(${img.thumb})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                        ))}
                      </div>
                      <input
                        type="url"
                        value={bgImageUrl}
                        onChange={(e) => setBgImageUrl(e.target.value)}
                        placeholder="Or paste a custom image URL…"
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  )}

                  {/* Preview swatch */}
                  <div
                    className="h-10 rounded-lg"
                    style={getBoardBgStyle(
                      bgTab === 'image' && bgImageUrl.trim() ? bgImageUrl.trim() : bgColor
                    )}
                  />

                  <button
                    onClick={applyBackground}
                    className="w-full rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* ── Labels panel ── */}
            {menuPanel === 'labels' && (
              <div>
                <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                  <button
                    onClick={() => setMenuPanel('main')}
                    className="p-0.5 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    aria-label="Back"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                  </button>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex-1 text-center">
                    Board labels
                  </p>
                </div>
                <div className="p-3 flex flex-col gap-3">
                  {/* Existing labels */}
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {boardLabels.length === 0 && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-2">
                        No labels yet
                      </p>
                    )}
                    {boardLabels.map((label) => (
                      <div key={label.id} className="flex items-center gap-2">
                        <span
                          className="flex-1 rounded px-2 py-1 text-xs font-medium text-white truncate"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name || label.color}
                        </span>
                        <button
                          onClick={() => deleteLabel(label.id)}
                          aria-label={`Delete label ${label.name ?? label.color}`}
                          className="p-1 rounded text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-zinc-700" />

                  {/* Create new label */}
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Create label
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelColor(color)}
                        aria-pressed={newLabelColor === color}
                        className={cn(
                          'h-6 rounded transition-all hover:scale-105',
                          newLabelColor === color && 'ring-2 ring-offset-1 ring-brand-500'
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <label
                      aria-label="Custom color"
                      title="Custom color"
                      className={cn(
                        'relative h-6 rounded cursor-pointer overflow-hidden hover:scale-105 transition-all',
                        !LABEL_COLORS.includes(newLabelColor) &&
                          'ring-2 ring-offset-1 ring-brand-500'
                      )}
                      style={{
                        background: !LABEL_COLORS.includes(newLabelColor)
                          ? newLabelColor
                          : 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span
                          className="text-white text-sm font-bold"
                          style={{ textShadow: '0 0 3px rgba(0,0,0,0.6)' }}
                        >
                          +
                        </span>
                      </span>
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreateLabel()
                    }}
                    placeholder="Label name (optional)"
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={() => void handleCreateLabel()}
                    disabled={creatingLabel}
                    className="w-full rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                  >
                    {creatingLabel ? 'Creating…' : 'Create label'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Members panel ── */}
            {menuPanel === 'members' && (
              <div>
                <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                  <button
                    onClick={() => setMenuPanel('main')}
                    className="p-0.5 rounded text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    aria-label="Back"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                  </button>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex-1 text-center">
                    Members
                  </p>
                </div>
                <div className="p-3 flex flex-col gap-2 max-h-72 overflow-y-auto">
                  {members.map((m) => {
                    const isMe = m.user_id === currentUser?.id
                    const isOwner = m.role === 'owner'
                    return (
                      <div key={m.user_id} className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0',
                            isOwner
                              ? 'bg-yellow-500'
                              : m.role === 'admin'
                                ? 'bg-brand-500'
                                : 'bg-zinc-500'
                          )}
                        >
                          {avatarInitial(m)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {m.profile?.username ?? m.user_id}
                            {isMe && <span className="text-zinc-400"> (you)</span>}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {ROLE_LABELS[m.role] ?? m.role}
                          </p>
                        </div>
                        {/* Role + remove controls — only visible to owner/admin, not on owner row */}
                        {canManage && !isOwner && !isMe && (
                          <div className="flex items-center gap-1 shrink-0">
                            <select
                              value={m.role}
                              onChange={(e) =>
                                void handleRoleChange(m, e.target.value as 'admin' | 'member')
                              }
                              className="text-[10px] rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-0.5 px-1 focus:outline-none"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => void handleRemoveMember(m)}
                              aria-label={`Remove ${m.profile?.username ?? 'member'}`}
                              className="p-0.5 rounded text-zinc-400 hover:text-red-500 transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Confirm close panel ── */}
            {menuPanel === 'confirm-close' && (
              <div className="p-3">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Close board?
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  You can reopen it later from the boards page.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleCloseBoard()}
                    className="flex-1 rounded bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setMenuPanel('main')}
                    className="flex-1 rounded bg-zinc-100 dark:bg-zinc-700 px-2 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
