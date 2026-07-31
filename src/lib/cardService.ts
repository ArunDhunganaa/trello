import { supabase } from './supabase'
import type { Card } from '../types'

type CardUpdate = Partial<
  Pick<
    Card,
    'title' | 'description' | 'position' | 'list_id' | 'due_date' | 'cover_color' | 'is_archived'
  >
>

export async function fetchCards(boardId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('board_id', boardId)
    .eq('is_archived', false)
    .order('position', { ascending: true })

  if (error) throw error
  return data as Card[]
}

export async function createCard(
  listId: string,
  boardId: string,
  title: string,
  position: number
): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .insert({ list_id: listId, board_id: boardId, title, position })
    .select()
    .single()

  if (error) throw error
  return data as Card
}

export async function updateCard(id: string, updates: CardUpdate): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Card
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw error
}
