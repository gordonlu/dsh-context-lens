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

import { surfaceGrowthAlarm } from './cache.ts'
import type { LikelyCause, RequestDiff, RequestRecord } from './types.ts'

/**
 * Diff one request against the previous one. `likelyCauses` is populated
 * only when the current request's cache reuse dropped, and lists the request
 * changes observed at the same boundary in a fixed rule order — correlation,
 * never causation.
 * @param previous - the previous finalized request, or undefined for the first.
 * @param current - the newly finalized request.
 * @returns the diff.
 */
export function diffRequests(previous: RequestRecord | undefined, current: RequestRecord): RequestDiff {
  const providerChanged = previous !== undefined && previous.provider !== current.provider
  const modelChanged = previous !== undefined && previous.model !== current.model
  const configChanged = previous !== undefined && previous.header.configHash !== current.header.configHash
  const system = diffSystem(previous, current)
  const tools = diffTools(previous, current)
  const surfaceDelta = previous === undefined
    ? undefined
    : current.estimatedSurfaceTokens - previous.estimatedSurfaceTokens
  const currentReuse = current.cache?.reuse
  const previousReuse = current.cache?.previousReuse
  const deltaPoints = current.cache?.deltaPoints
  const diff: RequestDiff = {
    modelChanged,
    providerChanged,
    configChanged,
    system,
    tools,
    surface: {
      ...surfaceDelta === undefined ? {} : { estimatedDeltaTokens: surfaceDelta },
    },
    ...currentReuse !== undefined && previousReuse !== undefined
      ? {
        cache: {
          previousHitRate: previousReuse * 100,
          currentHitRate: currentReuse * 100,
          ...deltaPoints === undefined ? {} : { deltaPoints },
        },
      }
      : {},
  }
  if (previous !== undefined && current.cache?.drop === true) {
    diff.likelyCauses = likelyCauses(diff, previous, surfaceDelta)
  }
  return diff
}

/** The system-prompt part of a request diff: changed plus byte sizes when known. */
function diffSystem(previous: RequestRecord | undefined, current: RequestRecord): RequestDiff['system'] {
  if (previous === undefined) return { changed: false }
  const changed = previous.header.systemHash !== current.header.systemHash
  return {
    changed,
    ...changed && previous.header.systemBytes !== undefined ? { beforeBytes: previous.header.systemBytes } : {},
    ...changed && current.header.systemBytes !== undefined ? { afterBytes: current.header.systemBytes } : {},
  }
}

/** The tool-set part of a request diff, derived by name over both fingerprints. */
function diffTools(previous: RequestRecord | undefined, current: RequestRecord): RequestDiff['tools'] {
  if (previous === undefined) {
    return { changed: false, added: [], removed: [], modified: [], orderChanged: false }
  }
  const previousByName = new Map(previous.header.tools.map(tool => [tool.name, tool]))
  const currentByName = new Map(current.header.tools.map(tool => [tool.name, tool]))
  const added: string[] = []
  const removed: string[] = []
  const modified: string[] = []
  for (const [name, tool] of currentByName) {
    const before = previousByName.get(name)
    if (before === undefined) added.push(name)
    else if (before.schemaHash !== tool.schemaHash) modified.push(name)
  }
  for (const name of previousByName.keys()) {
    if (!currentByName.has(name)) removed.push(name)
  }
  added.sort()
  removed.sort()
  modified.sort()
  // Declaration order is model-observable: the provider sees the array as
  // serialized, so a reorder is a committed request change even when the
  // tool set and every schema are identical.
  const orderChanged = added.length === 0 && removed.length === 0
    && previous.header.tools.some((tool, index) => current.header.tools[index]?.name !== tool.name)
  const changed = added.length > 0 || removed.length > 0 || modified.length > 0 || orderChanged
  return { changed, added, removed, modified, orderChanged }
}

/**
 * Rule-ranked candidate causes for a cache drop, in fixed priority order:
 * provider/model, system, tools, config, surface growth, then the fallback.
 * @param diff - the request diff.
 * @param previous - the previous request.
 * @param surfaceDelta - the estimated surface delta.
 * @returns the ranked cause list.
 */
export function likelyCauses(diff: RequestDiff, previous: RequestRecord, surfaceDelta: number | undefined): LikelyCause[] {
  const causes: LikelyCause[] = []
  if (diff.providerChanged || diff.modelChanged) causes.push('model-or-provider-changed')
  if (diff.system.changed) causes.push('system-changed')
  if (diff.tools.changed) causes.push('tools-changed')
  if (diff.configChanged) causes.push('config-changed')
  const previousBilled = previous.cache?.billedInputTokens
  if (surfaceDelta !== undefined && surfaceGrowthAlarm(previousBilled, surfaceDelta)) causes.push('surface-grew')
  if (causes.length === 0) causes.push('no-obvious-change')
  return causes
}
