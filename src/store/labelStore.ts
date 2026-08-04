import { create } from 'zustand'
import type { Label } from '../types'
import * as labelService from '../lib/labelService'

interface LabelState {
  boardLabels: Label[]
  cardLabelMap: Record<string, string[]>
  fetchBoardData: (boardId: string) => Promise<void>
  createLabel: (boardId: string, color: string, name?: string) => Promise<Label>
  deleteLabel: (labelId: string) => void
  toggleLabel: (cardId: string, labelId: string) => void
  clearLabels: () => void
}

export const useLabelStore = create<LabelState>((set, get) => ({
  boardLabels: [],
  cardLabelMap: {},

  fetchBoardData: async (boardId) => {
    const [labels, pairs] = await Promise.all([
      labelService.fetchLabels(boardId),
      labelService.fetchCardLabelIds(boardId),
    ])
    const cardLabelMap: Record<string, string[]> = {}
    for (const { card_id, label_id } of pairs) {
      if (!cardLabelMap[card_id]) cardLabelMap[card_id] = []
      cardLabelMap[card_id].push(label_id)
    }
    set({ boardLabels: labels, cardLabelMap })
  },

  createLabel: async (boardId, color, name) => {
    const label = await labelService.createLabel(boardId, color, name)
    set((s) => ({ boardLabels: [...s.boardLabels, label] }))
    return label
  },

  deleteLabel: (labelId) => {
    labelService.deleteLabel(labelId).catch(() => {})
    set((s) => ({
      boardLabels: s.boardLabels.filter((l) => l.id !== labelId),
      cardLabelMap: Object.fromEntries(
        Object.entries(s.cardLabelMap).map(([cid, ids]) => [
          cid,
          ids.filter((id) => id !== labelId),
        ])
      ),
    }))
  },

  toggleLabel: (cardId, labelId) => {
    const prev = get().cardLabelMap[cardId] ?? []
    const isAssigned = prev.includes(labelId)
    const next = isAssigned ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    set((s) => ({ cardLabelMap: { ...s.cardLabelMap, [cardId]: next } }))

    const revert = () => set((s) => ({ cardLabelMap: { ...s.cardLabelMap, [cardId]: prev } }))

    if (isAssigned) {
      labelService.unassignLabel(cardId, labelId).catch(revert)
    } else {
      labelService.assignLabel(cardId, labelId).catch(revert)
    }
  },

  clearLabels: () => set({ boardLabels: [], cardLabelMap: {} }),
}))
