/**
 * Request-to-request diffing over committed, model-observable request state:
 * one O(N) pass over the previous and current tool fingerprints (set
 * membership, schema hashes, and declaration order) plus direct hash
 * comparisons for system/config/model. Canonical fingerprints make key order
 * irrelevant while array order stays meaningful. Deterministic and pure —
 * the diff is computed once at finalization and stored on the record.
 *
 * @module dsh-context-lens/diff
 */
import type { LikelyCause, RequestDiff, RequestRecord } from './types.ts';
/**
 * Diff one request against the previous one. `likelyCauses` is populated
 * only when the current request's cache reuse dropped, and lists the request
 * changes observed at the same boundary in a fixed rule order — correlation,
 * never causation.
 * @param previous - the previous finalized request, or undefined for the first.
 * @param current - the newly finalized request.
 * @returns the diff.
 */
export declare function diffRequests(previous: RequestRecord | undefined, current: RequestRecord): RequestDiff;
/**
 * Rule-ranked candidate causes for a cache drop, in fixed priority order:
 * provider/model, system, tools, config, surface growth, then the fallback.
 * @param diff - the request diff.
 * @param previous - the previous request.
 * @param surfaceDelta - the estimated surface delta.
 * @returns the ranked cause list.
 */
export declare function likelyCauses(diff: RequestDiff, previous: RequestRecord, surfaceDelta: number | undefined): LikelyCause[];
