import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentsSection } from './CommentsSection'
import * as commentService from '../../lib/commentService'

vi.mock('../../lib/commentService')
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '../../store/authStore'

const mockUser = { id: 'user-1' }

const mockComment = {
  id: 'c1',
  card_id: 'card-1',
  user_id: 'user-1',
  body: 'Hello world',
  created_at: '2026-08-04T10:00:00Z',
  updated_at: '2026-08-04T10:00:00Z',
  author_username: 'alice',
  author_avatar_url: null,
}

beforeEach(() => {
  vi.mocked(useAuthStore).mockImplementation(
    (selector: (s: { user: typeof mockUser }) => unknown) => selector({ user: mockUser })
  )
  vi.mocked(commentService.fetchComments).mockResolvedValue([mockComment])
  vi.mocked(commentService.createComment).mockResolvedValue({
    ...mockComment,
    id: 'c2',
    body: 'New comment',
  })
  vi.mocked(commentService.updateComment).mockResolvedValue({ ...mockComment, body: 'Edited' })
  vi.mocked(commentService.deleteComment).mockResolvedValue(undefined)
})

describe('CommentsSection', () => {
  it('renders existing comments fetched from the service', async () => {
    render(<CommentsSection cardId="card-1" />)
    expect(await screen.findByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('hides the Save button when the draft is empty', () => {
    render(<CommentsSection cardId="card-1" />)
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
  })

  it('shows the Save button once the user starts typing', async () => {
    const user = userEvent.setup()
    render(<CommentsSection cardId="card-1" />)
    await user.type(screen.getByPlaceholderText(/write a comment/i), 'hi')
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
  })

  it('posts a comment and clears the textarea', async () => {
    const user = userEvent.setup()
    render(<CommentsSection cardId="card-1" />)
    await user.type(screen.getByPlaceholderText(/write a comment/i), 'New comment')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(commentService.createComment).toHaveBeenCalledWith('card-1', 'user-1', 'New comment')
    await waitFor(() => expect(screen.getByPlaceholderText(/write a comment/i)).toHaveValue(''))
  })

  it('shows an error message when posting fails', async () => {
    const user = userEvent.setup()
    vi.mocked(commentService.createComment).mockRejectedValue(new Error('Could not post comment'))
    render(<CommentsSection cardId="card-1" />)
    await user.type(screen.getByPlaceholderText(/write a comment/i), 'hi')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByText('Could not post comment')).toBeInTheDocument()
  })

  it("shows Edit and Delete controls for the current user's own comment", async () => {
    render(<CommentsSection cardId="card-1" />)
    await screen.findByText('Hello world')
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it("hides Edit and Delete controls for another user's comment", async () => {
    vi.mocked(commentService.fetchComments).mockResolvedValue([
      { ...mockComment, user_id: 'other-user' },
    ])
    render(<CommentsSection cardId="card-1" />)
    await screen.findByText('Hello world')
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('removes the comment from the list when Delete is clicked', async () => {
    const user = userEvent.setup()
    render(<CommentsSection cardId="card-1" />)
    await screen.findByText('Hello world')
    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(commentService.deleteComment).toHaveBeenCalledWith('c1')
    expect(screen.queryByText('Hello world')).not.toBeInTheDocument()
  })

  it('shows inline edit textarea when Edit is clicked', async () => {
    const user = userEvent.setup()
    render(<CommentsSection cardId="card-1" />)
    await screen.findByText('Hello world')
    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument()
  })
})
