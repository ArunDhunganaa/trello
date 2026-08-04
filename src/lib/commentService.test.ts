import * as commentService from './commentService'

vi.mock('./supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from './supabase'

const mockFrom = vi.mocked(supabase.from)

const mockCommentRow = {
  id: 'c1',
  card_id: 'card-1',
  user_id: 'user-1',
  body: 'Hello',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  profiles: { username: 'alice', avatar_url: null },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchComments', () => {
  it('selects comments for the given card_id ordered by created_at', async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockCommentRow], error: null }),
    }
    mockFrom.mockReturnValueOnce(selectChain as never)

    const result = await commentService.fetchComments('card-1')

    expect(mockFrom).toHaveBeenCalledWith('comments')
    expect(selectChain.eq).toHaveBeenCalledWith('card_id', 'card-1')
    expect(result[0].body).toBe('Hello')
    expect(result[0].author_username).toBe('alice')
  })

  it('throws when Supabase returns an error', async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    }
    mockFrom.mockReturnValueOnce(selectChain as never)

    await expect(commentService.fetchComments('card-1')).rejects.toThrow('DB error')
  })
})

describe('createComment', () => {
  it('inserts first then fetches (two separate requests)', async () => {
    // First from() call: insert
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    // Second from() call: select
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCommentRow, error: null }),
    }
    mockFrom.mockReturnValueOnce(insertChain as never).mockReturnValueOnce(selectChain as never)

    const result = await commentService.createComment('card-1', 'user-1', 'Hello')

    expect(insertChain.insert).toHaveBeenCalledWith({
      card_id: 'card-1',
      user_id: 'user-1',
      body: 'Hello',
    })
    expect(result.id).toBe('c1')
    expect(result.author_username).toBe('alice')
  })

  it('throws immediately when insert fails (does not proceed to select)', async () => {
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ data: null, error: new Error('FK violation') }),
    }
    mockFrom.mockReturnValueOnce(insertChain as never)

    await expect(commentService.createComment('card-1', 'user-1', 'Hello')).rejects.toThrow(
      'FK violation'
    )
    // from() should only have been called once (no select step)
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})

describe('updateComment', () => {
  it('updates then fetches the updated comment', async () => {
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { ...mockCommentRow, body: 'Edited' }, error: null }),
    }
    mockFrom.mockReturnValueOnce(updateChain as never).mockReturnValueOnce(selectChain as never)

    const result = await commentService.updateComment('c1', 'Edited')

    expect(updateChain.update).toHaveBeenCalledWith({ body: 'Edited' })
    expect(result.body).toBe('Edited')
  })
})

describe('deleteComment', () => {
  it('deletes by id', async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockFrom.mockReturnValueOnce(deleteChain as never)

    await commentService.deleteComment('c1')

    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'c1')
  })
})
