import { create } from 'zustand'
import type { Card } from '../types'
import * as cardService from '../lib/cardService'
import { between } from '../lib/fractional'

interface CardState {
  cards: Card[]
  isLoading: boolean
  error: string | null
  fetchCards: (boardId: string) => Promise<void>
  createCard: (listId: string, boardId: string, title: string) => Promise<void>
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  clearCards: () => void
  // Realtime: apply server-pushed changes directly (no API call)
  upsertCard: (card: Card) => void
  removeCard: (id: string) => void
}

export const useCardStore = create<CardState>((set, get) => ({
  cards: [],
  isLoading: false,
  error: null,

  fetchCards: async (boardId) => {
    set({ isLoading: true, error: null })
    try {
      const cards = await cardService.fetchCards(boardId)
      set({ cards, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createCard: async (listId, boardId, title) => {
    const listCards = get().cards.filter((c) => c.list_id === listId)
    const lastCard = listCards.at(-1)
    const position = between(lastCard?.position ?? null, null)
    set({ error: null })
    try {
      const card = await cardService.createCard(listId, boardId, title, position)
      set((state) => {
        // Realtime may have already added this card — don't duplicate it
        if (state.cards.some((c) => c.id === card.id)) return {}
        return { cards: [...state.cards, card] }
      })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  updateCard: async (id, updates) => {
    const prev = get().cards
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }))
    try {
      const updated = await cardService.updateCard(id, updates)
      set((state) => ({
        cards: state.cards.map((c) => (c.id === id ? updated : c)),
      }))
    } catch (err) {
      set({ cards: prev, error: (err as Error).message })
    }
  },

  deleteCard: async (id) => {
    const prev = get().cards
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }))
    try {
      await cardService.deleteCard(id)
    } catch (err) {
      set({ cards: prev, error: (err as Error).message })
    }
  },

  clearCards: () => set({ cards: [] }),

  upsertCard: (card) => {
    if (card.is_archived) {
      set((state) => ({ cards: state.cards.filter((c) => c.id !== card.id) }))
      return
    }
    set((state) => {
      const exists = state.cards.some((c) => c.id === card.id)
      if (exists) {
        return { cards: state.cards.map((c) => (c.id === card.id ? card : c)) }
      }
      return { cards: [...state.cards, card] }
    })
  },

  removeCard: (id) => set((state) => ({ cards: state.cards.filter((c) => c.id !== id) })),
}))
