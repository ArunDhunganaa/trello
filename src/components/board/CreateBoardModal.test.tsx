import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateBoardModal } from './CreateBoardModal'

vi.mock('../../store/boardStore', () => ({
  useBoardStore: vi.fn(),
}))
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'

const mockCreateBoard = vi.fn()

beforeEach(() => {
  vi.mocked(useBoardStore).mockImplementation(
    (selector: (s: { createBoard: typeof mockCreateBoard; isLoading: boolean }) => unknown) =>
      selector({ createBoard: mockCreateBoard, isLoading: false })
  )
  vi.mocked(useAuthStore).mockImplementation((selector: (s: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'user-1' } })
  )
  mockCreateBoard.mockResolvedValue(undefined)
})

describe('CreateBoardModal', () => {
  const onClose = vi.fn()

  afterEach(() => {
    onClose.mockClear()
  })

  it('renders the title input and action buttons', () => {
    render(<CreateBoardModal onClose={onClose} />)
    expect(screen.getByLabelText(/board title/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('shows the Color tab selected by default', () => {
    render(<CreateBoardModal onClose={onClose} />)
    const colorTab = screen.getByRole('button', { name: /color/i })
    expect(colorTab).toHaveAttribute('type', 'button')
    // Color swatches visible (8 presets + 1 custom picker = 9 buttons in the color grid)
    expect(screen.getByLabelText('Blue')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateBoardModal onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows a validation error when the form is submitted without a title', async () => {
    const user = userEvent.setup()
    render(<CreateBoardModal onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /create/i }))
    expect(await screen.findByText(/board title is required/i)).toBeInTheDocument()
    expect(mockCreateBoard).not.toHaveBeenCalled()
  })

  it('calls createBoard with the title and selected color on valid submit', async () => {
    const user = userEvent.setup()
    render(<CreateBoardModal onClose={onClose} />)
    await user.type(screen.getByLabelText(/board title/i), 'My Project')
    await user.click(screen.getByRole('button', { name: /create/i }))
    expect(mockCreateBoard).toHaveBeenCalledWith('My Project', '#0079BF', 'user-1')
  })

  it('switches to the Image tab and shows preset thumbnails', async () => {
    const user = userEvent.setup()
    render(<CreateBoardModal onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /image/i }))
    expect(screen.getByPlaceholderText(/custom image url/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mountains' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beach' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aurora' })).toBeInTheDocument()
  })

  it('uses the selected preset image URL as the background on submit', async () => {
    const user = userEvent.setup()
    render(<CreateBoardModal onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: /image/i }))
    await user.click(screen.getByRole('button', { name: 'Mountains' }))
    await user.type(screen.getByLabelText(/board title/i), 'Nature Board')
    await user.click(screen.getByRole('button', { name: /create/i }))
    expect(mockCreateBoard).toHaveBeenCalledWith(
      'Nature Board',
      expect.stringContaining('unsplash.com'),
      'user-1'
    )
  })
})
