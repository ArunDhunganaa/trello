import { supabase } from './supabase'
import type { Label } from '../types'

export async function fetchLabels(boardId: string): Promise<Label[]> {
  const { data, error } = await supabase.from('labels').select('*').eq('board_id', boardId)
  if (error) throw error
  return data as Label[]
}

export async function createLabel(boardId: string, color: string, name?: string): Promise<Label> {
  const { data, error } = await supabase
    .from('labels')
    .insert({ board_id: boardId, color, name: name ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Label
}

export async function deleteLabel(id: string): Promise<void> {
  const { error } = await supabase.from('labels').delete().eq('id', id)
  if (error) throw error
}

export async function fetchCardLabelIds(
  boardId: string
): Promise<{ card_id: string; label_id: string }[]> {
  const { data: labelRows, error: e1 } = await supabase
    .from('labels')
    .select('id')
    .eq('board_id', boardId)
  if (e1) throw e1
  if (!labelRows.length) return []

  const ids = (labelRows as { id: string }[]).map((l) => l.id)
  const { data, error } = await supabase
    .from('card_labels')
    .select('card_id, label_id')
    .in('label_id', ids)
  if (error) throw error
  return data as { card_id: string; label_id: string }[]
}

export async function assignLabel(cardId: string, labelId: string): Promise<void> {
  const { error } = await supabase
    .from('card_labels')
    .insert({ card_id: cardId, label_id: labelId })
  if (error) throw error
}

export async function unassignLabel(cardId: string, labelId: string): Promise<void> {
  const { error } = await supabase
    .from('card_labels')
    .delete()
    .eq('card_id', cardId)
    .eq('label_id', labelId)
  if (error) throw error
}
