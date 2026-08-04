import { cn, getBoardBgStyle, getDueDateStatus } from './utils'

describe('cn', () => {
  it('joins truthy class names with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('returns empty string when all values are falsy', () => {
    expect(cn(false, null, undefined)).toBe('')
  })

  it('handles a single class', () => {
    expect(cn('only')).toBe('only')
  })
})

describe('getBoardBgStyle', () => {
  it('returns backgroundColor for a hex color', () => {
    expect(getBoardBgStyle('#0079BF')).toEqual({ backgroundColor: '#0079BF' })
  })

  it('returns backgroundImage style for an http URL', () => {
    const style = getBoardBgStyle('https://images.unsplash.com/photo.jpg')
    expect(style.backgroundImage).toBe('url(https://images.unsplash.com/photo.jpg)')
    expect(style.backgroundSize).toBe('cover')
    expect(style.backgroundPosition).toBe('center')
  })

  it('returns backgroundImage style for a protocol-relative URL', () => {
    const style = getBoardBgStyle('//cdn.example.com/img.png')
    expect(style.backgroundImage).toContain('//cdn.example.com')
  })

  it('returns backgroundImage style for a data URI', () => {
    const style = getBoardBgStyle('data:image/png;base64,abc')
    expect(style.backgroundImage).toContain('data:image/png')
  })

  it('returns backgroundColor for non-URL strings like rgb()', () => {
    expect(getBoardBgStyle('rgb(0,121,191)')).toEqual({ backgroundColor: 'rgb(0,121,191)' })
  })
})

describe('getDueDateStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for null input', () => {
    expect(getDueDateStatus(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(getDueDateStatus(undefined)).toBeNull()
  })

  it('returns overdue for a past date', () => {
    expect(getDueDateStatus('2026-08-03')).toBe('overdue')
  })

  it('returns due-today for today', () => {
    expect(getDueDateStatus('2026-08-04')).toBe('due-today')
  })

  it('returns due-soon for tomorrow', () => {
    expect(getDueDateStatus('2026-08-05')).toBe('due-soon')
  })

  it('returns due-soon for two days away', () => {
    expect(getDueDateStatus('2026-08-06')).toBe('due-soon')
  })

  it('returns upcoming for three or more days away', () => {
    expect(getDueDateStatus('2026-08-07')).toBe('upcoming')
  })

  it('returns upcoming for a far future date', () => {
    expect(getDueDateStatus('2027-01-01')).toBe('upcoming')
  })
})
