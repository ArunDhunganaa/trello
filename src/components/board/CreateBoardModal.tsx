import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { MouseEvent } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { cn, getBoardBgStyle } from '../../lib/utils'

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

export const BOARD_IMAGES = [
  {
    thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=130&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
    label: 'Mountains',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=130&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
    label: 'Beach',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200&h=130&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80',
    label: 'Forest',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=200&h=130&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=1920&q=80',
    label: 'Aurora',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200&h=130&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80',
    label: 'Abstract',
  },
  {
    thumb: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=130&fit=crop&q=60',
    full: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80',
    label: 'Sunlight',
  },
] as const

const schema = z.object({
  title: z.string().min(1, 'Board title is required').max(100, 'Title is too long'),
})

type FormData = z.infer<typeof schema>

interface CreateBoardModalProps {
  onClose: () => void
}

type BgTab = 'color' | 'image'

export function CreateBoardModal({ onClose }: CreateBoardModalProps) {
  const createBoard = useBoardStore((s) => s.createBoard)
  const isLoading = useBoardStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)
  const [bgTab, setBgTab] = useState<BgTab>('color')
  const [selectedColor, setSelectedColor] = useState<string>(BOARD_COLORS[0].value)
  const [imageUrl, setImageUrl] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const titleValue = watch('title', '')
  const activeBg = bgTab === 'image' && imageUrl.trim() ? imageUrl.trim() : selectedColor

  const onSubmit = async ({ title }: FormData) => {
    if (!user) return
    await createBoard(title, activeBg, user.id)
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
        <div className="h-24 flex items-end px-4 pb-3" style={getBoardBgStyle(activeBg)}>
          <span className="text-white font-semibold text-sm drop-shadow-sm truncate">
            {titleValue || <span className="opacity-50">Board title</span>}
          </span>
        </div>

        <div className="p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Create board</h2>

          {/* Background section */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Background
            </p>

            {/* Tab switcher */}
            <div className="flex gap-1 mb-3 p-0.5 bg-gray-100 rounded-lg w-fit">
              {(['color', 'image'] as BgTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setBgTab(tab)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                    bgTab === tab
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {bgTab === 'color' ? (
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
                <label
                  aria-label="Custom color"
                  title="Custom color"
                  className={cn(
                    'relative w-9 h-9 rounded-lg cursor-pointer overflow-hidden hover:scale-105 transition-all focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-gray-700',
                    !BOARD_COLORS.some(
                      (c) => c.value.toLowerCase() === selectedColor.toLowerCase()
                    ) && 'ring-2 ring-offset-2 ring-gray-800 scale-105'
                  )}
                  style={{
                    background: !BOARD_COLORS.some(
                      (c) => c.value.toLowerCase() === selectedColor.toLowerCase()
                    )
                      ? selectedColor
                      : 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899, #ef4444)',
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span
                      className="text-white text-sm font-bold"
                      style={{ textShadow: '0 0 3px rgba(0,0,0,0.6)' }}
                    >
                      +
                    </span>
                  </span>
                  <input
                    type="color"
                    value={selectedColor.toLowerCase()}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {BOARD_IMAGES.map((img) => (
                    <button
                      key={img.full}
                      type="button"
                      onClick={() => setImageUrl(img.full)}
                      title={img.label}
                      aria-label={img.label}
                      aria-pressed={imageUrl === img.full}
                      className={cn(
                        'h-12 rounded-lg bg-gray-200 ring-offset-1 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-700',
                        imageUrl === img.full && 'ring-2 ring-offset-2 ring-gray-800 scale-105'
                      )}
                      style={{
                        backgroundImage: `url(${img.thumb})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ))}
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste a custom image URL…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
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
