import { supabase } from './supabase'
import type { List } from '../types'

type ListUpdate = Partial<Pick<List, 'title' | 'position' | 'is_archived'>>

export async function fetchLists(boardId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('board_id', boardId)
    .eq('is_archived', false)
    .order('position', { ascending: true })

  if (error) throw error
  return data as List[]
}

export async function createList(boardId: string, title: string, position: number): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .insert({ board_id: boardId, title, position })
    .select()
    .single()

  if (error) throw error
  return data as List
}

export async function updateList(id: string, updates: ListUpdate): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as List
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', id)
  if (error) throw error
}
