/**
 * Change-first request summaries shared by the list and the inspector: one
 * tag per request ("stable / cache drop / tools changed / …"), a global
 * request ordinal across the session (survives window trimming), and the
 * structural-change predicate the "hide unchanged" filter uses.
 *
 * @module dsh-context-lens/client/request-summary
 */
import type { ContextLensKey } from './locales.ts';
import type { RequestRecord } from '../types.ts';
/** Surface growth (estimated delta tokens) below this is background noise. */
export declare const SURFACE_TAG_MIN_DELTA = 1024;
/** The per-request one-line summary categories. */
export type RequestTagKind = 'stable' | 'drop' | 'tools' | 'system' | 'config' | 'model' | 'provider' | 'surface' | 'failed' | 'aborted';
export interface RequestTag {
    kind: RequestTagKind;
    /** Locale key when the tag is copy; `null` for the numeric surface tag. */
    key: ContextLensKey | null;
    /** Rendered text: either `t(key)` or the surface delta string. */
    text: string;
    /** Whether the request deserves alarm styling in the list. */
    alarming: boolean;
}
/**
 * One-line summary of a request relative to its predecessor: status wins,
 * then a cache drop, then structural changes (in diff rule order), then
 * significant surface growth; everything else is stable.
 * @param request - the request record.
 * @param t - the bound translate.
 * @returns the tag.
 */
export declare function requestTag(request: RequestRecord, t: (key: ContextLensKey, params?: Record<string, string>) => string): RequestTag;
/**
 * The session-global ordinal of a request: the newest retained request is
 * `totalRequests` (the cumulative counter survives window trimming), so the
 * ordinal of window index `i` (0-based, newest last) is
 * `totalRequests - (length - 1 - i)`.
 * @param index - window index (0 = oldest retained).
 * @param length - retained window length.
 * @param totalRequests - cumulative request counter.
 * @returns the 1-based session ordinal.
 */
export declare function globalOrdinal(index: number, length: number, totalRequests: number): number;
/**
 * Whether a request differs structurally from its predecessor (used by the
 * hide-unchanged filter; surface-only growth does not count).
 * @param request - the request record.
 * @returns true when tools/system/config/model/provider changed or the cache dropped.
 */
export declare function structurallyChanged(request: RequestRecord): boolean;
/**
 * Whether a request is "unchanged" for the list filter. The definition must
 * match the tag computation exactly: a stable tag is hideable; ANY other tag
 * — including significant surface growth — is interesting. A request with a
 * +17.6K context jump but no structural change must NOT vanish under the
 * default filter; the whole point of the lens is surfacing it.
 */
export declare function isUnchanged(request: RequestRecord): boolean;
