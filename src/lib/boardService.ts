import { supabase } from './supabase'
import type { Board } from '../types'

type BoardUpdate = Partial<
  Pick<Board, 'title' | 'description' | 'background' | 'is_starred' | 'is_archived'>
>

export async function fetchBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Board[]
}

export async function createBoard(
  title: string,
  background: string,
  ownerId: string
): Promise<void> {
  // Insert without .select() — PostgREST evaluates the SELECT RLS policy on
  // RETURNING before the on_board_created AFTER trigger commits board_members,
  // so is_board_member() returns false and the whole transaction rolls back.
  // Two separate requests avoid this: INSERT commits first, trigger fires, then
  // the subsequent fetchBoards call sees the membership row.
  const { error } = await supabase.from('boards').insert({ title, background, owner_id: ownerId })

  if (error) throw error
}

export async function updateBoard(id: string, updates: BoardUpdate): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Board
}

export async function deleteBoard(id: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', id)
  if (error) throw error
}

export async function fetchArchivedBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('is_archived', true)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as Board[]
}

export async function fetchBoardById(id: string): Promise<Board | null> {
  const { data, error } = await supabase.from('boards').select('*').eq('id', id).single()
  if (error) return null
  return data as Board
}
