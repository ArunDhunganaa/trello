import { act } from '@testing-library/react'
import { useCardStore } from './cardStore'
import * as cardService from '../lib/cardService'

vi.mock('../lib/cardService')
vi.mock('../lib/fractional', () => ({
  between: vi.fn(() => 32768),
  INITIAL_POSITION: 32768,
}))

const makeCard = (overrides: Record<string, unknown> = {}) => ({
  id: 'card-1',
  list_id: 'list-1',
  board_id: 'board-1',
  title: 'My Card',
  description: null as string | null,
  position: 32768,
  due_date: null as string | null,
  cover_color: null as string | null,
  is_archived: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  useCardStore.setState({ cards: [], isLoading: false, error: null })
  vi.clearAllMocks()
})

describe('upsertCard', () => {
  it('adds a new card when it does not exist', () => {
    act(() => useCardStore.getState().upsertCard(makeCard()))
    expect(useCardStore.getState().cards).toHaveLength(1)
  })

  it('updates an existing card in place', () => {
    useCardStore.setState({ cards: [makeCard()] })
    act(() => useCardStore.getState().upsertCard(makeCard({ title: 'Renamed' })))
    expect(useCardStore.getState().cards).toHaveLength(1)
    expect(useCardStore.getState().cards[0].title).toBe('Renamed')
  })

  it('removes the card when is_archived is true', () => {
    useCardStore.setState({ cards: [makeCard()] })
    act(() => useCardStore.getState().upsertCard(makeCard({ is_archived: true })))
    expect(useCardStore.getState().cards).toHaveLength(0)
  })
})

describe('removeCard', () => {
  it('removes the matching card by id', () => {
    useCardStore.setState({ cards: [makeCard(), makeCard({ id: 'card-2' })] })
    act(() => useCardStore.getState().removeCard('card-1'))
    expect(useCardStore.getState().cards).toHaveLength(1)
    expect(useCardStore.getState().cards[0].id).toBe('card-2')
  })
})

describe('updateCard', () => {
  it('applies update optimistically before the server responds', () => {
    useCardStore.setState({ cards: [makeCard()] })
    vi.mocked(cardService.updateCard).mockResolvedValue(makeCard({ title: 'Server Title' }))

    void useCardStore.getState().updateCard('card-1', { title: 'Optimistic Title' })

    expect(useCardStore.getState().cards[0].title).toBe('Optimistic Title')
  })

  it('reverts to previous state when the server call fails', async () => {
    useCardStore.setState({ cards: [makeCard()] })
    vi.mocked(cardService.updateCard).mockRejectedValue(new Error('fail'))

    await act(() => useCardStore.getState().updateCard('card-1', { title: 'Changed' }))

    expect(useCardStore.getState().cards[0].title).toBe('My Card')
    expect(useCardStore.getState().error).toBe('fail')
  })
})

describe('deleteCard', () => {
  it('removes card immediately from state', () => {
    useCardStore.setState({ cards: [makeCard()] })
    vi.mocked(cardService.deleteCard).mockResolvedValue(undefined)

    void useCardStore.getState().deleteCard('card-1')

    expect(useCardStore.getState().cards).toHaveLength(0)
  })

  it('restores card when delete fails', async () => {
    useCardStore.setState({ cards: [makeCard()] })
    vi.mocked(cardService.deleteCard).mockRejectedValue(new Error('fail'))

    await act(() => useCardStore.getState().deleteCard('card-1'))

    expect(useCardStore.getState().cards).toHaveLength(1)
  })
})

describe('createCard — Realtime dedup', () => {
  it('does not add a duplicate if Realtime already inserted the card', async () => {
    // Simulate Realtime arriving first
    useCardStore.setState({ cards: [makeCard()] })
    vi.mocked(cardService.createCard).mockResolvedValue(makeCard())

    await act(() => useCardStore.getState().createCard('list-1', 'board-1', 'My Card'))

    expect(useCardStore.getState().cards).toHaveLength(1)
  })
})
