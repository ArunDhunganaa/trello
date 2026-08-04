import { supabase } from './supabase'
import type { Attachment } from '../types'

const BUCKET = 'Trello'

export async function fetchAttachments(cardId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('card_attachments')
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Attachment[]
}

export async function uploadAttachment(
  cardId: string,
  boardId: string,
  uploadedBy: string,
  file: File
): Promise<Attachment> {
  const storagePath = `${boardId}/${cardId}/${crypto.randomUUID()}-${file.name}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('card_attachments')
    .insert({
      card_id: cardId,
      uploaded_by: uploadedBy,
      filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
    })
    .select()
    .single()
  if (error) throw error
  return data as Attachment
}

export async function deleteAttachment(attachment: Attachment): Promise<void> {
  await supabase.storage.from(BUCKET).remove([attachment.storage_path])
  const { error } = await supabase.from('card_attachments').delete().eq('id', attachment.id)
  if (error) throw error
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
  if (error) throw error
  return data.signedUrl
}
