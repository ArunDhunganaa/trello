import type { CSSProperties } from 'react'

/** Joins class names, filtering falsy values. Does not resolve Tailwind conflicts. */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Returns a background CSS style for a board/card — handles both hex colors and image URLs. */
export function getBoardBgStyle(bg: string): CSSProperties {
  if (bg.startsWith('http') || bg.startsWith('//') || bg.startsWith('data:')) {
    return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  return { backgroundColor: bg }
}

export type DueDateStatus = 'overdue' | 'due-today' | 'due-soon' | 'upcoming' | null

/** Returns the urgency status for a due date string (YYYY-MM-DD). */
export function getDueDateStatus(dueDate: string | null | undefined): DueDateStatus {
  if (!dueDate) return null
  const due = new Date(dueDate.slice(0, 10) + 'T00:00:00')
  const today = new Date(new Date().toDateString())
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'due-today'
  if (diffDays <= 2) return 'due-soon'
  return 'upcoming'
}
