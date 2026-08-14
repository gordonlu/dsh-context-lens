/**
 * Change-first request summaries shared by the list and the inspector: one
 * tag per request ("stable / cache drop / tools changed / …"), a global
 * request ordinal across the session (survives window trimming), and the
 * structural-change predicate the "hide unchanged" filter uses.
 *
 * @module dsh-context-lens/client/request-summary
 */

import type { ContextLensKey } from './locales.ts'
import type { RequestRecord } from '../types.ts'
import { formatTokens } from './format.ts'

/** Surface growth (estimated delta tokens) below this is background noise. */
export const SURFACE_TAG_MIN_DELTA = 1024

/** The per-request one-line summary categories. */
export type RequestTagKind =
  | 'stable'
  | 'drop'
  | 'tools'
  | 'system'
  | 'config'
  | 'model'
  | 'provider'
  | 'surface'
  | 'failed'
  | 'aborted'

export interface RequestTag {
  kind: RequestTagKind
  /** Locale key when the tag is copy; `null` for the numeric surface tag. */
  key: ContextLensKey | null
  /** Rendered text: either `t(key)` or the surface delta string. */
  text: string
  /** Whether the request deserves alarm styling in the list. */
  alarming: boolean
}

/**
 * One-line summary of a request relative to its predecessor: status wins,
 * then a cache drop, then structural changes (in diff rule order), then
 * significant surface growth; everything else is stable.
 * @param request - the request record.
 * @param t - the bound translate.
 * @returns the tag.
 */
export function requestTag(request: RequestRecord, t: (key: ContextLensKey, params?: Record<string, string>) => string): RequestTag {
  if (request.status !== 'completed') {
    const key: ContextLensKey = `list.status.${request.status}`
    return { kind: request.status, key, text: t(key), alarming: true }
  }
  const diff = request.diffFromPrevious
  if (request.cache?.drop === true) {
    return { kind: 'drop', key: 'list.tag.drop', text: t('list.tag.drop'), alarming: true }
  }
  if (diff !== undefined) {
    if (diff.tools.changed) {
      return { kind: 'tools', key: 'list.tag.tools', text: t('list.tag.tools'), alarming: true }
    }
    if (diff.system.changed) {
      return { kind: 'system', key: 'list.tag.system', text: t('list.tag.system'), alarming: true }
    }
    if (diff.configChanged) {
      return { kind: 'config', key: 'list.tag.config', text: t('list.tag.config'), alarming: true }
    }
    if (diff.modelChanged) {
      return { kind: 'model', key: 'list.tag.model', text: t('list.tag.model'), alarming: true }
    }
    if (diff.providerChanged) {
      return { kind: 'provider', key: 'list.tag.provider', text: t('list.tag.provider'), alarming: true }
    }
    if (diff.surface.estimatedDeltaTokens !== undefined && diff.surface.estimatedDeltaTokens >= SURFACE_TAG_MIN_DELTA) {
      const text = t('list.tag.surface', { delta: formatTokens(diff.surface.estimatedDeltaTokens) })
      return { kind: 'surface', key: 'list.tag.surface', text, alarming: false }
    }
  }
  return { kind: 'stable', key: 'list.tag.stable', text: t('list.tag.stable'), alarming: false }
}

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
export function globalOrdinal(index: number, length: number, totalRequests: number): number {
  return totalRequests - (length - 1 - index)
}

/**
 * Whether a request differs structurally from its predecessor (used by the
 * hide-unchanged filter; surface-only growth does not count).
 * @param request - the request record.
 * @returns true when tools/system/config/model/provider changed or the cache dropped.
 */
export function structurallyChanged(request: RequestRecord): boolean {
  if (request.cache?.drop === true) return true
  const diff = request.diffFromPrevious
  return diff !== undefined && (
    diff.tools.changed || diff.system.changed || diff.configChanged
    || diff.modelChanged || diff.providerChanged
  )
}

/**
 * Whether a request is "unchanged" for the list filter. The definition must
 * match the tag computation exactly: a stable tag is hideable; ANY other tag
 * — including significant surface growth — is interesting. A request with a
 * +17.6K context jump but no structural change must NOT vanish under the
 * default filter; the whole point of the lens is surfacing it.
 */
export function isUnchanged(request: RequestRecord): boolean {
  if (request.status !== 'completed') return false
  if (structurallyChanged(request)) return false
  const delta = request.diffFromPrevious?.surface.estimatedDeltaTokens
  return delta === undefined || delta < SURFACE_TAG_MIN_DELTA
}

/**
 * Whether a request is interesting ONLY because of significant surface
 * growth — no structural change, no cache drop, no failure. The second-layer
 * list filter hides these by default, leaving true events (drops, structural
 * changes, failures); unchecking the filter reveals them again.
 * @param request - the request record.
 * @returns true when the request survives the unchanged filter solely via surface growth.
 */
export function surfaceOnly(request: RequestRecord): boolean {
  return !structurallyChanged(request) && !isUnchanged(request)
}
