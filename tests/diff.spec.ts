import { describe, expect, it } from 'vitest'
import { diffRequests, likelyCauses } from '../src/diff.ts'
import type { RequestDiff, RequestRecord } from '../src/types.ts'
import { fingerprintHeader } from '../src/fingerprint.ts'
import { epochHeader, toolSchema, usage } from './helpers.ts'

function record(overrides: Partial<RequestRecord> = {}): RequestRecord {
  const header = fingerprintHeader(epochHeader('system', []))
  return {
    id: '1:1',
    turn: 1,
    step: 1,
    seq: 2,
    time: 0,
    status: 'completed',
    header,
    estimatedSurfaceTokens: 0,
    ...overrides,
  }
}

function recordWithUsage(
  inputTokens: number,
  cacheReadTokens: number,
  overrides: Partial<RequestRecord> = {},
): RequestRecord {
  return record({
    usage: usage(inputTokens, 100, { cacheReadTokens }),
    cache: {
      reuse: cacheReadTokens / (inputTokens + cacheReadTokens),
      billedInputTokens: inputTokens + cacheReadTokens,
      drop: false,
    },
    ...overrides,
  })
}

describe('diffRequests', () => {
  it('returns an unchanged diff for identical consecutive requests', () => {
    const diff = diffRequests(record(), record())
    expect(diff.modelChanged).toBe(false)
    expect(diff.providerChanged).toBe(false)
    expect(diff.configChanged).toBe(false)
    expect(diff.system).toEqual({ changed: false })
    expect(diff.tools).toEqual({ changed: false, added: [], removed: [], modified: [], orderChanged: false })
    expect(diff.likelyCauses).toBeUndefined()
  })

  it('detects model and provider changes', () => {
    const before = record({ model: 'deepseek-chat', provider: 'deepseek' })
    const after = record({ model: 'deepseek-reasoner', provider: 'deepseek' })
    const diff = diffRequests(before, after)
    expect(diff.modelChanged).toBe(true)
    expect(diff.providerChanged).toBe(false)

    const providerDiff = diffRequests(record({ provider: 'a' }), record({ provider: 'b' }))
    expect(providerDiff.providerChanged).toBe(true)
  })

  it('detects system prompt changes with byte sizes', () => {
    const before = record()
    const after = record({
      header: fingerprintHeader(epochHeader('different system', [])),
    })
    const diff = diffRequests(before, after)
    expect(diff.system.changed).toBe(true)
    expect(diff.system.beforeBytes).toBe(Buffer.byteLength('system', 'utf8'))
    expect(diff.system.afterBytes).toBe(Buffer.byteLength('different system', 'utf8'))
  })

  it('classifies tools by name into added, removed, and modified', () => {
    const before = record({
      header: fingerprintHeader(epochHeader(undefined, [toolSchema('kept'), toolSchema('gone')])),
    })
    const after = record({
      header: fingerprintHeader(epochHeader(undefined, [toolSchema('kept', { extra: true }), toolSchema('new')])),
    })
    const diff = diffRequests(before, after)
    expect(diff.tools.changed).toBe(true)
    expect(diff.tools.added).toEqual(['new'])
    expect(diff.tools.removed).toEqual(['gone'])
    expect(diff.tools.modified).toEqual(['kept'])
  })

  it('reports orderChanged when the identical tool set is declared in a different order', () => {
    const before = record({
      header: fingerprintHeader(epochHeader(undefined, [toolSchema('alpha'), toolSchema('beta')])),
    })
    const after = record({
      header: fingerprintHeader(epochHeader(undefined, [toolSchema('beta'), toolSchema('alpha')])),
    })
    const diff = diffRequests(before, after)
    expect(diff.tools.added).toEqual([])
    expect(diff.tools.removed).toEqual([])
    expect(diff.tools.modified).toEqual([])
    expect(diff.tools.orderChanged).toBe(true)
    expect(diff.tools.changed).toBe(true)
  })

  it('does not report orderChanged when the order is identical', () => {
    const diff = diffRequests(
      record({ header: fingerprintHeader(epochHeader(undefined, [toolSchema('alpha'), toolSchema('beta')])) }),
      record({ header: fingerprintHeader(epochHeader(undefined, [toolSchema('alpha'), toolSchema('beta')])) }),
    )
    expect(diff.tools.orderChanged).toBe(false)
    expect(diff.tools.changed).toBe(false)
  })

  it('ignores tool schema key order inside a schema', () => {
    const before = record({
      header: fingerprintHeader(epochHeader(undefined, [
        toolSchema('t', { parameters: { type: 'object', properties: { a: {}, b: {} } } }),
      ])),
    })
    const after = record({
      header: fingerprintHeader(epochHeader(undefined, [
        toolSchema('t', { parameters: { type: 'object', properties: { b: {}, a: {} } } }),
      ])),
    })
    const diff = diffRequests(before, after)
    expect(diff.tools.modified).toEqual([])
    expect(diff.tools.changed).toBe(false)
  })

  it('reports surface growth and the cache boundary', () => {
    const diff = diffRequests(
      recordWithUsage(1000, 900, { estimatedSurfaceTokens: 100 }),
      recordWithUsage(1000, 0, {
        estimatedSurfaceTokens: 200,
        cache: { reuse: 0, billedInputTokens: 1000, previousReuse: 0.9, deltaPoints: -90, drop: true },
      }),
    )
    expect(diff.surface.estimatedDeltaTokens).toBe(100)
    expect(diff.cache?.previousHitRate).toBeCloseTo(90)
    expect(diff.cache?.currentHitRate).toBeCloseTo(0)
    expect(diff.cache?.deltaPoints).toBeCloseTo(-90)
  })

  it('populates likelyCauses only on a drop', () => {
    const dropDiff = diffRequests(
      recordWithUsage(2000, 1800),
      recordWithUsage(1000, 0, { cache: { reuse: 0, billedInputTokens: 1000, drop: true } }),
    )
    expect(dropDiff.likelyCauses).toBeDefined()

    const noDropDiff = diffRequests(recordWithUsage(1000, 900), recordWithUsage(1000, 850))
    expect(noDropDiff.likelyCauses).toBeUndefined()
  })
})

describe('likelyCauses', () => {
  it('ranks rules in fixed priority order and falls back when nothing changed', () => {
    const diff: RequestDiff = {
      modelChanged: true,
      providerChanged: false,
      configChanged: true,
      system: { changed: true },
      tools: { changed: true, added: [], removed: [], modified: [], orderChanged: false },
      surface: { estimatedDeltaTokens: 5000 },
    }
    const causes = likelyCauses(diff, recordWithUsage(2000, 1800), 5000)
    expect(causes).toEqual([
      'model-or-provider-changed',
      'system-changed',
      'tools-changed',
      'config-changed',
      'surface-grew',
    ])

    const fallback = likelyCauses(
      {
        modelChanged: false,
        providerChanged: false,
        configChanged: false,
        system: { changed: false },
        tools: { changed: false, added: [], removed: [], modified: [], orderChanged: false },
        surface: {},
      },
      recordWithUsage(2000, 1800),
      undefined,
    )
    expect(fallback).toEqual(['no-obvious-change'])
  })

  it('omits surface-grew when the surface actually shrank', () => {
    const causes = likelyCauses(
      {
        modelChanged: false,
        providerChanged: false,
        configChanged: false,
        system: { changed: false },
        tools: { changed: false, added: [], removed: [], modified: [], orderChanged: false },
        surface: {},
      },
      recordWithUsage(2000, 1800),
      -100,
    )
    expect(causes).toEqual(['no-obvious-change'])
  })
})
