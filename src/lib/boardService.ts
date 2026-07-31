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
): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .insert({ title, background, owner_id: ownerId })
    .select()
    .single()

  if (error) throw error
  return data as Board
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
