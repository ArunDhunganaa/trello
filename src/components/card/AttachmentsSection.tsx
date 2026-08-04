import { useState, useEffect } from 'react'
import type { Attachment } from '../../types'
import * as attachmentService from '../../lib/attachmentService'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../store/toastStore'
import { cn } from '../../lib/utils'

interface AttachmentsSectionProps {
  cardId: string
  boardId: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export function AttachmentsSection({ cardId, boardId }: AttachmentsSectionProps) {
  const user = useAuthStore((s) => s.user)
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    attachmentService
      .fetchAttachments(cardId)
      .then(setAttachments)
      .catch(() => {})
  }, [cardId])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > MAX_SIZE) {
      toast('File must be under 20 MB', 'error')
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const attachment = await attachmentService.uploadAttachment(cardId, boardId, user.id, file)
      setAttachments((prev) => [...prev, attachment])
      toast('File attached', 'success')
    } catch {
      toast('Upload failed — check Storage bucket exists', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDownload(att: Attachment) {
    // Open blank tab synchronously (within the click gesture) so popup blockers allow it,
    // then navigate to the signed URL once it resolves.
    const tab = window.open('about:blank', '_blank')
    try {
      const url = await attachmentService.getSignedUrl(att.storage_path)
      if (tab) tab.location.href = url
    } catch {
      if (tab) tab.close()
      toast('Could not generate download link', 'error')
    }
  }

  function handleDelete(att: Attachment) {
    attachmentService.deleteAttachment(att).catch(() => {})
    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-zinc-500 shrink-0"
          >
            <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
          </svg>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Attachments</h3>
        </div>
        <label
          className={cn(
            'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium',
            'text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700',
            'hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {uploading ? 'Uploading…' : '+ Attach file'}
          <input type="file" className="sr-only" onChange={handleFileChange} disabled={uploading} />
        </label>
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-zinc-400 px-1">No attachments yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="group flex items-center gap-3 rounded-lg bg-zinc-200 dark:bg-zinc-700/60 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {att.filename}
                </p>
                <p className="text-xs text-zinc-400">{formatBytes(att.size_bytes)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(att)}
                  className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label="Download"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                  </svg>
                </button>
                {user?.id === att.uploaded_by && (
                  <button
                    onClick={() => handleDelete(att)}
                    className="rounded p-1 text-zinc-400 hover:text-red-500 transition-colors"
                    aria-label="Delete attachment"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
