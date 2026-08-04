import { supabase } from './supabase'
import type { BoardMember } from '../types'

export async function getMyRole(boardId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('board_members')
    .select('role')
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as { role: string } | null)?.role ?? null
}

export async function fetchMembers(boardId: string): Promise<BoardMember[]> {
  // Fetch board_members without a profiles join — board_members.user_id references
  // auth.users, not profiles, so PostgREST can't resolve the embedded join directly.
  const { data: rows, error } = await supabase
    .from('board_members')
    .select('board_id, user_id, role')
    .eq('board_id', boardId)
  if (error) {
    if (error.code === 'PGRST200' || (error as { status?: number }).status === 400) return []
    throw error
  }
  if (!rows || rows.length === 0) return []

  const typedRows = rows as { board_id: string; user_id: string; role: string }[]
  const userIds = typedRows.map((r) => r.user_id)

  // Fetch profiles separately using the user IDs collected above
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds)

  const profileMap = new Map(
    ((profileRows ?? []) as { id: string; username: string; avatar_url: string | null }[]).map(
      (p) => [p.id, p]
    )
  )

  return typedRows.map((row) => {
    const profile = profileMap.get(row.user_id)
    return {
      board_id: row.board_id,
      user_id: row.user_id,
      role: row.role as BoardMember['role'],
      profile: profile
        ? {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            created_at: '',
          }
        : undefined,
    }
  })
}

export async function findProfileByEmail(
  email: string
): Promise<{ id: string; username: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()
  if (error || !data) return null
  return data as { id: string; username: string }
}

export async function addMember(
  boardId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  const { error } = await supabase
    .from('board_members')
    .insert({ board_id: boardId, user_id: userId, role })
  if (error) throw error
}

export async function removeMember(boardId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function updateMemberRole(
  boardId: string,
  userId: string,
  role: 'admin' | 'member'
): Promise<void> {
  const { error } = await supabase
    .from('board_members')
    .update({ role })
    .eq('board_id', boardId)
    .eq('user_id', userId)
  if (error) throw error
}
