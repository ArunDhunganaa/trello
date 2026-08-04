import { act } from '@testing-library/react'
import { useBoardStore } from './boardStore'
import * as boardService from '../lib/boardService'

vi.mock('../lib/boardService')

const makeBoard = (overrides: Partial<ReturnType<typeof makeBoard>> = {}) => ({
  id: 'board-1',
  owner_id: 'user-1',
  title: 'My Board',
  description: null as string | null,
  background: '#0079BF',
  is_starred: false,
  is_archived: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  useBoardStore.setState({
    boards: [],
    archivedBoards: [],
    currentBoard: null,
    isLoading: false,
    error: null,
  })
  vi.clearAllMocks()
})

describe('updateBoard', () => {
  it('applies the update optimistically before the server responds', async () => {
    const board = makeBoard()
    useBoardStore.setState({ boards: [board] })
    vi.mocked(boardService.updateBoard).mockResolvedValue({ ...board, title: 'Updated' })

    // Start the update but don't await yet
    const promise = useBoardStore.getState().updateBoard('board-1', { title: 'Updated' })
    // State already changed
    expect(useBoardStore.getState().boards[0].title).toBe('Updated')
    await promise
  })

  it('reverts to the previous state when the server call fails', async () => {
    const board = makeBoard()
    useBoardStore.setState({ boards: [board] })
    vi.mocked(boardService.updateBoard).mockRejectedValue(new Error('Network error'))

    await act(() => useBoardStore.getState().updateBoard('board-1', { title: 'Updated' }))

    expect(useBoardStore.getState().boards[0].title).toBe('My Board')
    expect(useBoardStore.getState().error).toBe('Network error')
  })

  it('moves board from boards to archivedBoards when is_archived becomes true', async () => {
    const board = makeBoard()
    useBoardStore.setState({ boards: [board], archivedBoards: [] })
    vi.mocked(boardService.updateBoard).mockResolvedValue({ ...board, is_archived: true })

    await act(() => useBoardStore.getState().updateBoard('board-1', { is_archived: true }))

    expect(useBoardStore.getState().boards).toHaveLength(0)
    expect(useBoardStore.getState().archivedBoards).toHaveLength(1)
  })

  it('moves board from archivedBoards back to boards when is_archived becomes false', async () => {
    const board = makeBoard({ is_archived: true })
    useBoardStore.setState({ boards: [], archivedBoards: [board] })
    vi.mocked(boardService.updateBoard).mockResolvedValue({ ...board, is_archived: false })

    await act(() => useBoardStore.getState().updateBoard('board-1', { is_archived: false }))

    expect(useBoardStore.getState().archivedBoards).toHaveLength(0)
    expect(useBoardStore.getState().boards).toHaveLength(1)
  })

  it('also updates currentBoard when it matches the id', async () => {
    const board = makeBoard()
    useBoardStore.setState({ boards: [board], currentBoard: board })
    vi.mocked(boardService.updateBoard).mockResolvedValue({ ...board, title: 'New Title' })

    await act(() => useBoardStore.getState().updateBoard('board-1', { title: 'New Title' }))

    expect(useBoardStore.getState().currentBoard?.title).toBe('New Title')
  })
})

describe('toggleStar', () => {
  it('flips is_starred optimistically', () => {
    const board = makeBoard({ is_starred: false })
    useBoardStore.setState({ boards: [board] })
    vi.mocked(boardService.updateBoard).mockResolvedValue({ ...board, is_starred: true })

    void useBoardStore.getState().toggleStar('board-1')

    expect(useBoardStore.getState().boards[0].is_starred).toBe(true)
  })

  it('reverts is_starred when the server call fails', async () => {
    const board = makeBoard({ is_starred: false })
    useBoardStore.setState({ boards: [board] })
    vi.mocked(boardService.updateBoard).mockRejectedValue(new Error('fail'))

    await act(() => useBoardStore.getState().toggleStar('board-1'))

    expect(useBoardStore.getState().boards[0].is_starred).toBe(false)
  })

  it('does nothing when the board is not found', async () => {
    useBoardStore.setState({ boards: [] })

    await act(() => useBoardStore.getState().toggleStar('nonexistent'))

    expect(boardService.updateBoard).not.toHaveBeenCalled()
  })
})

describe('deleteBoard', () => {
  it('removes the board from the list immediately', () => {
    const board = makeBoard()
    useBoardStore.setState({ boards: [board] })
    vi.mocked(boardService.deleteBoard).mockResolvedValue(undefined)

    void useBoardStore.getState().deleteBoard('board-1')

    expect(useBoardStore.getState().boards).toHaveLength(0)
  })

  it('restores the board when the delete fails', async () => {
    const board = makeBoard()
    useBoardStore.setState({ boards: [board] })
    vi.mocked(boardService.deleteBoard).mockRejectedValue(new Error('fail'))

    await act(() => useBoardStore.getState().deleteBoard('board-1'))

    expect(useBoardStore.getState().boards).toHaveLength(1)
  })
})

describe('clearError', () => {
  it('resets the error field to null', () => {
    useBoardStore.setState({ error: 'Something went wrong' })
    useBoardStore.getState().clearError()
    expect(useBoardStore.getState().error).toBeNull()
  })
})
