/**
 * Display-helper tests: percentage formatting must stay sign-free (locale
 * templates own the `%` glyph — a doubled sign was the `100%%` regression),
 * token compaction, and hash shortening.
 */

import { describe, expect, it } from 'vitest'
import { formatPercent, formatTokens, shortHash } from '../src/client/format.ts'

describe('format helpers', () => {
  it('formats a ratio as a sign-free whole-number percent', () => {
    expect(formatPercent(0)).toBe('0')
    expect(formatPercent(0.1)).toBe('10')
    expect(formatPercent(0.915)).toBe('92')
    expect(formatPercent(1)).toBe('100')
    expect(formatPercent(0.02325)).toBe('2')
    expect(formatPercent(0.9995)).toBe('100')
    expect(formatPercent(0.004)).toBe('0')
    // No sign: the locale template appends it.
    expect(formatPercent(1)).not.toContain('%')
  })

  it('compacts token counts with suffixes', () => {
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(800)).toBe('800')
    expect(formatTokens(1234)).toBe('1.2k')
    expect(formatTokens(12_400)).toBe('12.4k')
    expect(formatTokens(1_200_000)).toBe('1.2M')
  })

  it('shortens hashes to the first 8 chars', () => {
    expect(shortHash('0123456789abcdef')).toBe('01234567')
    expect(shortHash('abcdef')).toBe('abcdef')
  })
})
