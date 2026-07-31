import { create } from 'zustand'
import type { Board } from '../types'
import * as boardService from '../lib/boardService'

interface BoardState {
  boards: Board[]
  isLoading: boolean
  error: string | null
  fetchBoards: () => Promise<void>
  createBoard: (title: string, background: string, ownerId: string) => Promise<void>
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>
  clearError: () => void
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  isLoading: false,
  error: null,

  fetchBoards: async () => {
    set({ isLoading: true, error: null })
    try {
      const boards = await boardService.fetchBoards()
      set({ boards, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createBoard: async (title, background, ownerId) => {
    set({ error: null })
    try {
      const board = await boardService.createBoard(title, background, ownerId)
      set((state) => ({ boards: [board, ...state.boards] }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  updateBoard: async (id, updates) => {
    const prev = get().boards
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }))
    try {
      const updated = await boardService.updateBoard(id, updates)
      set((state) => ({
        boards: state.boards.map((b) => (b.id === id ? updated : b)),
      }))
    } catch (err) {
      set({ boards: prev, error: (err as Error).message })
    }
  },

  deleteBoard: async (id) => {
    const prev = get().boards
    set((state) => ({ boards: state.boards.filter((b) => b.id !== id) }))
    try {
      await boardService.deleteBoard(id)
    } catch (err) {
      set({ boards: prev, error: (err as Error).message })
    }
  },

  toggleStar: async (id) => {
    const board = get().boards.find((b) => b.id === id)
    if (!board) return
    const wasStarred = board.is_starred
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, is_starred: !wasStarred } : b)),
    }))
    try {
      await boardService.updateBoard(id, { is_starred: !wasStarred })
    } catch (err) {
      set((state) => ({
        boards: state.boards.map((b) => (b.id === id ? { ...b, is_starred: wasStarred } : b)),
        error: (err as Error).message,
      }))
    }
  },

  clearError: () => set({ error: null }),
}))
