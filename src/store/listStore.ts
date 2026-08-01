import { create } from 'zustand'
import type { List } from '../types'
import * as listService from '../lib/listService'
import { between } from '../lib/fractional'

interface ListState {
  lists: List[]
  isLoading: boolean
  error: string | null
  fetchLists: (boardId: string) => Promise<void>
  createList: (boardId: string, title: string) => Promise<void>
  updateList: (id: string, updates: Partial<List>) => Promise<void>
  deleteList: (id: string) => Promise<void>
  clearLists: () => void
  // Realtime: apply server-pushed changes directly (no API call)
  upsertList: (list: List) => void
  removeList: (id: string) => void
}

export const useListStore = create<ListState>((set, get) => ({
  lists: [],
  isLoading: false,
  error: null,

  fetchLists: async (boardId) => {
    set({ isLoading: true, error: null })
    try {
      const lists = await listService.fetchLists(boardId)
      set({ lists, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createList: async (boardId, title) => {
    const lastList = get().lists.at(-1)
    const position = between(lastList?.position ?? null, null)
    set({ error: null })
    try {
      const list = await listService.createList(boardId, title, position)
      set((state) => ({ lists: [...state.lists, list] }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  updateList: async (id, updates) => {
    const prev = get().lists
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }))
    try {
      const updated = await listService.updateList(id, updates)
      set((state) => ({
        lists: state.lists.map((l) => (l.id === id ? updated : l)),
      }))
    } catch (err) {
      set({ lists: prev, error: (err as Error).message })
    }
  },

  deleteList: async (id) => {
    const prev = get().lists
    set((state) => ({ lists: state.lists.filter((l) => l.id !== id) }))
    try {
      await listService.deleteList(id)
    } catch (err) {
      set({ lists: prev, error: (err as Error).message })
    }
  },

  clearLists: () => set({ lists: [] }),

  upsertList: (list) => {
    if (list.is_archived) {
      set((state) => ({ lists: state.lists.filter((l) => l.id !== list.id) }))
      return
    }
    set((state) => {
      const exists = state.lists.some((l) => l.id === list.id)
      if (exists) {
        return { lists: state.lists.map((l) => (l.id === list.id ? list : l)) }
      }
      return { lists: [...state.lists, list].sort((a, b) => a.position - b.position) }
    })
  },

  removeList: (id) => set((state) => ({ lists: state.lists.filter((l) => l.id !== id) })),
}))
