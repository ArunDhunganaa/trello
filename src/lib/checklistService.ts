import { supabase } from './supabase'
import type { Checklist, ChecklistItem } from '../types'
import { between } from './fractional'

interface ChecklistRow {
  id: string
  card_id: string
  title: string
  position: number
  checklist_items: ChecklistItem[]
}

export async function fetchChecklists(cardId: string): Promise<Checklist[]> {
  const { data, error } = await supabase
    .from('checklists')
    .select('*, checklist_items(*)')
    .eq('card_id', cardId)
    .order('position', { ascending: true })

  if (error) throw error
  return (data as ChecklistRow[]).map((row) => ({
    id: row.id,
    card_id: row.card_id,
    title: row.title,
    position: row.position,
    items: [...row.checklist_items].sort((a, b) => a.position - b.position),
  }))
}

export async function createChecklist(
  cardId: string,
  title: string,
  afterPosition: number | null
): Promise<Checklist> {
  const position = between(afterPosition, null)
  const { data, error } = await supabase
    .from('checklists')
    .insert({ card_id: cardId, title, position })
    .select()
    .single()

  if (error) throw error
  return { ...(data as Checklist), items: [] }
}

export async function deleteChecklist(id: string): Promise<void> {
  const { error } = await supabase.from('checklists').delete().eq('id', id)
  if (error) throw error
}

export async function createChecklistItem(
  checklistId: string,
  title: string,
  afterPosition: number | null
): Promise<ChecklistItem> {
  const position = between(afterPosition, null)
  const { data, error } = await supabase
    .from('checklist_items')
    .insert({ checklist_id: checklistId, title, position })
    .select()
    .single()

  if (error) throw error
  return data as ChecklistItem
}

export async function updateChecklistItem(
  id: string,
  updates: Partial<Pick<ChecklistItem, 'title' | 'is_completed'>>
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from('checklist_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ChecklistItem
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', id)
  if (error) throw error
}
