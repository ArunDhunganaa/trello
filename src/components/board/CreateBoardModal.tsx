import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { MouseEvent } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { cn } from '../../lib/utils'

export const BOARD_COLORS = [
  { value: '#0079BF', label: 'Blue' },
  { value: '#D29034', label: 'Orange' },
  { value: '#519839', label: 'Green' },
  { value: '#B04632', label: 'Red' },
  { value: '#89609E', label: 'Purple' },
  { value: '#CD5A91', label: 'Pink' },
  { value: '#4BBF6B', label: 'Teal' },
  { value: '#00AECC', label: 'Sky' },
] as const

const schema = z.object({
  title: z.string().min(1, 'Board title is required').max(100, 'Title is too long'),
})

type FormData = z.infer<typeof schema>

interface CreateBoardModalProps {
  onClose: () => void
}

export function CreateBoardModal({ onClose }: CreateBoardModalProps) {
  const createBoard = useBoardStore((s) => s.createBoard)
  const isLoading = useBoardStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)
  const [selectedColor, setSelectedColor] = useState<string>(BOARD_COLORS[0].value)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const titleValue = watch('title', '')

  const onSubmit = async ({ title }: FormData) => {
    if (!user) return
    await createBoard(title, selectedColor, user.id)
    onClose()
  }

  const handleBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Live board preview */}
        <div
          className="h-24 flex items-end px-4 pb-3 transition-colors duration-200"
          style={{ backgroundColor: selectedColor }}
        >
          <span className="text-white font-semibold text-sm drop-shadow-sm truncate">
            {titleValue || <span className="opacity-50">Board title</span>}
          </span>
        </div>

        <div className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Create board</h2>

          {/* Color swatches */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Background
            </p>
            <div className="flex flex-wrap gap-2">
              {BOARD_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  aria-label={c.label}
                  aria-pressed={selectedColor === c.value}
                  className={cn(
                    'w-9 h-9 rounded-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-700',
                    selectedColor === c.value && 'ring-2 ring-offset-2 ring-gray-800 scale-105'
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <Input
              label="Board title"
              placeholder="e.g. My Project"
              error={errors.title?.message}
              autoFocus
              {...register('title')}
            />
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading} className="flex-1">
                Create
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
