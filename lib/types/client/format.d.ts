/**
 * Pure display helpers for the Context Lens view. All functions are
 * deterministic; the component tree renders their outputs directly.
 *
 * @module dsh-context-lens/client/format
 */
/**
 * Format a ratio in [0, 1] as a whole-number percentage string.
 * @param ratio - the ratio.
 * @returns e.g. `"83%"`.
 */
export declare function formatPercent(ratio: number): string;
/**
 * Format a token count with a compact suffix.
 * @param tokens - the token count.
 * @returns e.g. `"12.4k"` or `"800"`.
 */
export declare function formatTokens(tokens: number): string;
/**
 * Shorten a hex fingerprint hash for inline display.
 * @param hash - the full hash.
 * @returns the first 8 characters.
 */
export declare function shortHash(hash: string): string;
