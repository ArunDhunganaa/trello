/**
 * Returns a position value halfway between a and b.
 * Null boundaries expand by 65536 so there is always room to prepend/append.
 *
 * Example: between(null, null) → 32768 (first item in an empty list)
 *          between(32768, null) → 65536 (appending after the first item)
 *          between(null, 32768) → 16384 (prepending before the first item)
 */
export function between(a: number | null, b: number | null): number {
  const lo = a ?? 0
  const hi = b ?? lo + 65536
  return (lo + hi) / 2
}

export const INITIAL_POSITION = 32768
