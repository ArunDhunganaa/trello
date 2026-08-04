import { create } from 'zustand'
import type { Board } from '../types'
import * as boardService from '../lib/boardService'

interface BoardState {
  boards: Board[]
  archivedBoards: Board[]
  currentBoard: Board | null
  isLoading: boolean
  error: string | null
  fetchBoards: () => Promise<void>
  fetchArchivedBoards: () => Promise<void>
  fetchBoardById: (id: string) => Promise<void>
  createBoard: (title: string, background: string, ownerId: string) => Promise<void>
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>
  clearError: () => void
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  archivedBoards: [],
  currentBoard: null,
  isLoading: false,
  error: null,

  fetchArchivedBoards: async () => {
    const archived = await boardService.fetchArchivedBoards()
    set({ archivedBoards: archived })
  },

  fetchBoardById: async (id) => {
    const board = await boardService.fetchBoardById(id)
    set({ currentBoard: board })
  },

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
      await boardService.createBoard(title, background, ownerId)
      // Fetch fresh after insert so the trigger-created board_members row is
      // committed and is_board_member() returns true for the SELECT policy.
      const boards = await boardService.fetchBoards()
      set({ boards })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  updateBoard: async (id, updates) => {
    const prev = get().boards
    const prevArchived = get().archivedBoards
    const prevCurrent = get().currentBoard
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      archivedBoards: state.archivedBoards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      currentBoard:
        state.currentBoard?.id === id ? { ...state.currentBoard, ...updates } : state.currentBoard,
    }))
    try {
      const updated = await boardService.updateBoard(id, updates)
      // Move the board between active ↔ archived lists based on is_archived
      if (updates.is_archived === true) {
        set((state) => ({
          boards: state.boards.filter((b) => b.id !== id),
          archivedBoards: [updated, ...state.archivedBoards.filter((b) => b.id !== id)],
        }))
      } else if (updates.is_archived === false) {
        set((state) => ({
          archivedBoards: state.archivedBoards.filter((b) => b.id !== id),
          boards: [updated, ...state.boards.filter((b) => b.id !== id)],
        }))
      } else {
        set((state) => ({
          boards: state.boards.map((b) => (b.id === id ? updated : b)),
          currentBoard: state.currentBoard?.id === id ? updated : state.currentBoard,
        }))
      }
    } catch (err) {
      set({
        boards: prev,
        archivedBoards: prevArchived,
        currentBoard: prevCurrent,
        error: (err as Error).message,
      })
    }
  },

  deleteBoard: async (id) => {
    const prev = get().boards
    const prevArchived = get().archivedBoards
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
      archivedBoards: state.archivedBoards.filter((b) => b.id !== id),
    }))
    try {
      await boardService.deleteBoard(id)
    } catch (err) {
      set({ boards: prev, archivedBoards: prevArchived, error: (err as Error).message })
    }
  },

  toggleStar: async (id) => {
    // Board may only be in currentBoard (direct URL navigation), not in boards[]
    const board =
      get().boards.find((b) => b.id === id) ??
      (get().currentBoard?.id === id ? get().currentBoard : null)
    if (!board) return
    const wasStarred = board.is_starred
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, is_starred: !wasStarred } : b)),
      currentBoard:
        state.currentBoard?.id === id
          ? { ...state.currentBoard, is_starred: !wasStarred }
          : state.currentBoard,
    }))
    try {
      await boardService.updateBoard(id, { is_starred: !wasStarred })
    } catch (err) {
      set((state) => ({
        boards: state.boards.map((b) => (b.id === id ? { ...b, is_starred: wasStarred } : b)),
        currentBoard:
          state.currentBoard?.id === id
            ? { ...state.currentBoard, is_starred: wasStarred }
            : state.currentBoard,
        error: (err as Error).message,
      }))
    }
  },

  clearError: () => set({ error: null }),
}))
