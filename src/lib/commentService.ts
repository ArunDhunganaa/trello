import { supabase } from './supabase'
import type { Comment } from '../types'

interface CommentRow {
  id: string
  card_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
  profiles: { username: string; avatar_url: string | null } | null
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    card_id: row.card_id,
    user_id: row.user_id,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_username: row.profiles?.username ?? 'Unknown',
    author_avatar_url: row.profiles?.avatar_url ?? null,
  }
}

export async function fetchComments(cardId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(username, avatar_url)')
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as CommentRow[]).map(toComment)
}

export async function createComment(
  cardId: string,
  userId: string,
  body: string
): Promise<Comment> {
  // Insert without .select() to avoid PostgREST's 409 RLS read-back conflict
  const { error: insertError } = await supabase
    .from('comments')
    .insert({ card_id: cardId, user_id: userId, body })
  if (insertError) throw insertError

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(username, avatar_url)')
    .eq('card_id', cardId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error) throw error
  return toComment(data as CommentRow)
}

export async function updateComment(id: string, body: string): Promise<Comment> {
  const { error: updateError } = await supabase.from('comments').update({ body }).eq('id', id)
  if (updateError) throw updateError

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(username, avatar_url)')
    .eq('id', id)
    .single()
  if (error) throw error
  return toComment(data as CommentRow)
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
