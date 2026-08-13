/**
 * Cache-reuse math over provider usage: reuse ratio, delta in percentage
 * points, and the drop detector. Everything is computed strictly from the
 * provider's disjoint usage buckets (uncached input + cache reads + cache
 * writes = billed input) — nothing here simulates a KV cache, and a missing
 * field stays absent instead of becoming zero.
 *
 * @module dsh-context-lens/cache
 */
import type { CacheObservation, RequestUsage } from './types.ts';
/** Below this absolute billed-input size a drop never alarms (too small to mean anything). */
export declare const CACHE_ALARM_MIN_BILLED_INPUT = 1000;
/** A reuse drop of at least this many percentage points flags a drop. */
export declare const CACHE_DROP_POINTS_THRESHOLD = 20;
/** Estimated surface growth of at least this many tokens flags `surface-grew`. */
export declare const SURFACE_GROWTH_ALARM_TOKENS = 1000;
/** Estimated surface growth of at least this fraction of the previous billed input flags `surface-grew`. */
export declare const SURFACE_GROWTH_ALARM_FRACTION = 0.2;
/**
 * Billed input tokens of one request: uncached input plus cache reads plus
 * cache writes.
 * @param usage - the request's provider usage.
 * @returns the billed input total.
 */
export declare function billedInputTokens(usage: RequestUsage): number;
/**
 * Cache reuse ratio of one request: cache reads divided by billed input.
 * @param usage - the request's provider usage.
 * @returns the reuse ratio in [0, 1], or undefined when usage or cache reads
 *   are unavailable (missing fields are never treated as zero).
 */
export declare function cacheReuse(usage: RequestUsage): number | undefined;
/**
 * Whether a surface growth of `deltaTokens` over the previous request is
 * large enough to be cache-relevant: at least the absolute alarm size, or at
 * least the fraction alarm of the previous billed input when that is known.
 * @param previousBilledInput - the previous request's billed input, when known.
 * @param deltaTokens - the estimated surface growth.
 * @returns true when the growth is flagged.
 */
export declare function surfaceGrowthAlarm(previousBilledInput: number | undefined, deltaTokens: number): boolean;
/**
 * Build one request's cache observation against the previous request's
 * usage. A drop is flagged only when both requests reported comparable
 * reuse, the previous request was large enough to mean something, and the
 * delta crossed the threshold. Absent data yields no reuse, no delta, and
 * never a drop.
 * @param usage - the current request's provider usage, or undefined when it reported none.
 * @param previousUsage - the previous request's provider usage, or undefined.
 * @returns the observation.
 */
export declare function observeCache(usage: RequestUsage | undefined, previousUsage: RequestUsage | undefined): CacheObservation;
