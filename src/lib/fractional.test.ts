import { between, INITIAL_POSITION } from './fractional'

describe('between', () => {
  it('returns 32768 for (null, null) — first item in an empty list', () => {
    expect(between(null, null)).toBe(32768)
  })

  it('returns the midpoint of two numbers', () => {
    expect(between(0, 32768)).toBe(16384)
  })

  it('appends after a value when b is null', () => {
    expect(between(32768, null)).toBe(65536)
  })

  it('prepends before a value when a is null', () => {
    expect(between(null, 32768)).toBe(16384)
  })

  it('always produces a value strictly between a and b', () => {
    const mid = between(10000, 20000)
    expect(mid).toBeGreaterThan(10000)
    expect(mid).toBeLessThan(20000)
  })

  it('works with values close together (no integer overflow)', () => {
    const mid = between(1, 3)
    expect(mid).toBe(2)
  })
})

describe('INITIAL_POSITION', () => {
  it('equals between(null, null)', () => {
    expect(INITIAL_POSITION).toBe(between(null, null))
  })
})
