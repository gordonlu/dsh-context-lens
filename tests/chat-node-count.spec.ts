/**
 * Regression guard for the 0.3.0 slot crash: `useSession`'s published type
 * declares a top-level `nodes` array, while the 0.1.5 runtime hands the view a
 * target-neutral snapshot (`views` + `activeTargets`). Reading the typed field
 * compiled fine and threw inside the slot entry at render time.
 */

import { describe, expect, it } from 'vitest'
import { CHAT_TARGET, chatNodeCount } from '../src/client/chat-node-count.ts'

/** The 0.1.5 shape the real shell hands over. */
function targetStoreSnapshot(order: readonly string[] | undefined) {
  return {
    views: {
      get: (target: string) => target === CHAT_TARGET && order !== undefined ? { order } : undefined,
    },
    activeTargets: new Set([CHAT_TARGET]),
  }
}

describe('chatNodeCount', () => {
  it('counts Chat nodes through the 0.1.5 target store', () => {
    expect(chatNodeCount(targetStoreSnapshot(['a', 'b', 'c']))).toBe(3)
  })

  it('reports zero for an empty conversation in the target store', () => {
    expect(chatNodeCount(targetStoreSnapshot([]))).toBe(0)
  })

  it('still understands the legacy top-level node array', () => {
    expect(chatNodeCount({ nodes: [{}, {}] })).toBe(2)
  })

  it('never throws on a snapshot exposing neither shape', () => {
    expect(chatNodeCount(targetStoreSnapshot(undefined))).toBe(0)
    expect(chatNodeCount({ views: {} })).toBe(0)
    expect(chatNodeCount({ views: { get: () => ({ nodes: {} }) } })).toBe(0)
    expect(chatNodeCount({})).toBe(0)
    expect(chatNodeCount(null)).toBe(0)
    expect(chatNodeCount(undefined)).toBe(0)
  })

  it('never throws when views is not the expected shape', () => {
    expect(chatNodeCount({ views: null })).toBe(0)
    expect(chatNodeCount({ views: { get: 'nope' } })).toBe(0)
    expect(chatNodeCount(42)).toBe(0)
  })
})
