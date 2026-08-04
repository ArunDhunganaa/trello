import { useState, useEffect } from 'react'
import * as boardMemberService from '../lib/boardMemberService'
import { useAuthStore } from '../store/authStore'
import type { BoardMember } from '../types'

export function useBoardMembers(boardId: string | undefined, ownerId?: string) {
  const currentUser = useAuthStore((s) => s.user)
  const [members, setMembers] = useState<BoardMember[]>([])
  const [myRole, setMyRole] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!boardId || !currentUser?.id) return
    setLoaded(false)
    setMyRole(null)
    Promise.all([
      // Simple role-only query — no profiles join, always works
      boardMemberService
        .getMyRole(boardId, currentUser.id)
        .then(setMyRole)
        .catch(() => {}),
      // Full member list for display (profiles join may fail gracefully)
      boardMemberService
        .fetchMembers(boardId)
        .then(setMembers)
        .catch(() => {}),
    ]).finally(() => setLoaded(true))
  }, [boardId, currentUser?.id])

  // Instant owner check from board record — no fetch needed
  const isOwner = !!ownerId && currentUser?.id === ownerId
  // Stay true while loading so controls don't flash-disabled for owners/admins
  const canManage = !loaded || isOwner || myRole === 'owner' || myRole === 'admin'

  return { members, setMembers, canManage }
}
