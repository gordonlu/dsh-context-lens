/**
 * Pure display helpers for the Context Lens view. All functions are
 * deterministic; the component tree renders their outputs directly.
 *
 * @module dsh-context-lens/client/format
 */

/**
 * Format a ratio in [0, 1] as a whole-number percentage string WITHOUT the
 * percent sign — locale templates own the `%` glyph (`'缓存 {percent}%'`),
 * so a sign here would render `100%%`.
 * @param ratio - the ratio.
 * @returns e.g. `"83"`.
 */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}`
}

/**
 * Format a token count with a compact suffix.
 * @param tokens - the token count.
 * @returns e.g. `"12.4k"` or `"800"`.
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`
  return String(tokens)
}

/**
 * Shorten a hex fingerprint hash for inline display.
 * @param hash - the full hash.
 * @returns the first 8 characters.
 */
export function shortHash(hash: string): string {
  return hash.length > 8 ? hash.slice(0, 8) : hash
}
