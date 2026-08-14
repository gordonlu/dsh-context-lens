import { describe, expect, it } from 'vitest'
import { MAX_RETAINED_REQUESTS, contextLensProjectionDefinition, type ContextLensState } from '../src/projection.ts'
import { fingerprintHeader } from '../src/fingerprint.ts'
import {
  assistantMessage,
  epochHeader,
  ev,
  foldProjection,
  streamChunkUsage,
  textBlock,
  toolResultMessage,
  toolSchema,
  turnEndReason,
  usage,
  userMessage,
} from './helpers.ts'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const headerA = epochHeader('system-a', [toolSchema('tool-a')])
const headerB = epochHeader('system-b', [toolSchema('tool-b')])

const startStep = (turn: number, step: number, seq: number) => ev('step/start', { turn, step }, { seq })

const headerEvent = (seq: number, header = headerA) => ev('request/header', { header, reason: 'change' }, { seq })

const message = (seq: number, turn: number, step: number, value: ReturnType<typeof usage>) =>
  ev('assistant/message', {
    turn,
    step,
    message: assistantMessage([textBlock('hello')]),
    usage: value,
  }, { seq })

const endTurn = (seq: number, turn: number, kind: 'completed' | 'aborted' | 'error' = 'completed') =>
  ev('turn/end', { turn, reason: turnEndReason(kind) }, { seq })

describe('contextLens projection: request lifecycle', () => {
  it('records one completed request per step with epoch header and usage', () => {
    const { view } = foldProjection([
      headerEvent(1),
      ev('request/context', { provider: 'deepseek', model: 'deepseek-chat', contextWindow: 131072 }, { seq: 2 }),
      startStep(1, 1, 3),
      message(4, 1, 1, usage(100, 50, { cacheReadTokens: 900 })),
      endTurn(5, 1),
    ])
    expect(view.summary.totalRequests).toBe(1)
    expect(view.recentRequests).toHaveLength(1)
    const record = view.latest!
    expect(record.id).toBe('1:1')
    expect(record.status).toBe('completed')
    expect(record.provider).toBe('deepseek')
    expect(record.model).toBe('deepseek-chat')
    expect(record.contextWindow).toBe(131072)
    expect(record.header.tools).toHaveLength(1)
    expect(record.usage).toEqual(usage(100, 50, { cacheReadTokens: 900 }))
    expect(record.cache?.reuse).toBeCloseTo(0.9)
    expect(record.diffFromPrevious).toBeUndefined()
  })

  it('carries the epoch header across requests and replaces it when a header lands inside the step', () => {
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      message(3, 1, 1, usage(100, 50)),
      endTurn(4, 1),
      headerEvent(5, headerB),
      startStep(2, 1, 6),
      message(7, 2, 1, usage(100, 50)),
      endTurn(8, 2),
    ])
    expect(view.recentRequests[0]!.header.toolsHash).not.toBe(view.recentRequests[1]!.header.toolsHash)

    const midStep = foldProjection([
      startStep(1, 1, 1),
      headerEvent(2),
      message(3, 1, 1, usage(100, 50)),
      endTurn(4, 1),
    ])
    expect(midStep.view.latest!.header.configHash).not.toBe('')
  })

  it('keeps a retry inside the same step and lets the final message usage win', () => {
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      ev('assistant/chunk', { turn: 1, step: 1, chunk: streamChunkUsage(usage(90, 10)) }, { seq: 3 }),
      headerEvent(4),
      message(5, 1, 1, usage(100, 50)),
      endTurn(6, 1),
    ])
    expect(view.recentRequests).toHaveLength(1)
    expect(view.summary.totalRequests).toBe(1)
    expect(view.latest!.usage).toEqual(usage(100, 50))
  })

  it('splits records when a retry opens a fresh turn (defensive: future-mainline shape)', () => {
    // Current DSH mainline retries INSIDE the same step (the agent loop
    // re-dispatches on `agent/request-error` with the same turn/step, so
    // chunks and the final message carry identical {turn, step} — one
    // record). The llm-retry README describes a fresh-turn shape; if
    // mainline ever moves there, the fold must naturally split at the new
    // step/start instead of merging attempts.
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      ev('assistant/chunk', { turn: 1, step: 1, chunk: streamChunkUsage(usage(50, 5)) }, { seq: 3 }),
      ev('step/end', { turn: 1, step: 1 }, { seq: 4 }),
      endTurn(5, 1, 'error'),
      // Attempt 2: fresh turn, fresh step.
      startStep(2, 1, 6),
      message(7, 2, 1, usage(100, 50)),
      endTurn(8, 2),
    ])
    expect(view.recentRequests.map(r => `${r.id}:${r.status}`)).toEqual(['1:1:failed', '2:1:completed'])
    expect(view.summary.totalRequests).toBe(2)
    expect(view.summary.cacheDrops).toBe(0)
  })

  it('marks aborted and failed turns without a message', () => {
    const aborted = foldProjection([
      startStep(1, 1, 1),
      endTurn(2, 1, 'aborted'),
    ])
    expect(aborted.view.latest!.status).toBe('aborted')

    const failed = foldProjection([
      startStep(1, 1, 1),
      endTurn(2, 1, 'error'),
    ])
    expect(failed.view.latest!.status).toBe('failed')
  })

  it('closes a crash-orphaned pending step as failed when the next step opens', () => {
    // No step/end and no turn/end for the first step: the orphan path must
    // still close it (as failed — a step that never ended) when step 2 opens.
    const { view } = foldProjection([
      startStep(1, 1, 1),
      message(2, 1, 1, usage(100, 50)),
      startStep(1, 2, 3),
      message(4, 1, 2, usage(200, 60)),
      endTurn(5, 1),
    ])
    expect(view.recentRequests.map(r => `${r.id}:${r.status}`)).toEqual(['1:1:failed', '1:2:completed'])
  })

  it('closes a crash-orphaned pending step across turns as failed', () => {
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      message(3, 1, 1, usage(100, 50)),
      startStep(2, 1, 4),
      message(5, 2, 1, usage(100, 50)),
      endTurn(6, 2),
    ])
    expect(view.summary.totalRequests).toBe(2)
    expect(view.recentRequests[0]!.status).toBe('failed')
    expect(view.recentRequests[1]!.status).toBe('completed')
  })

  it('keeps usage absent (not zero) when the adapter reported none', () => {
    const { view } = foldProjection([
      startStep(1, 1, 1),
      ev('assistant/message', { turn: 1, step: 1, message: assistantMessage([textBlock('hi')]) }, { seq: 2 }),
      endTurn(3, 1),
    ])
    expect(view.latest!.usage).toBeUndefined()
    expect(view.latest!.cache?.drop).toBe(false)
  })
})

describe('contextLens projection: step/end lifecycle (real loop shape)', () => {
  // The real agent loop emits step/start → … → step/end (always, even on
  // error/abort) → turn/end once per turn. The projection must finalize
  // intermediate steps at the next step/start as completed — not failed.

  it('finalizes every step of a multi-step turn as completed', () => {
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      message(3, 1, 1, usage(100, 50)),
      ev('step/end', { turn: 1, step: 1 }, { seq: 4 }),
      startStep(1, 2, 5),
      message(6, 1, 2, usage(200, 60)),
      ev('step/end', { turn: 1, step: 2 }, { seq: 7 }),
      endTurn(8, 1),
    ])
    expect(view.recentRequests.map(r => `${r.id}:${r.status}`)).toEqual(['1:1:completed', '1:2:completed'])
    expect(view.summary.totalRequests).toBe(2)
  })

  it('keeps an aborted no-message step aborted when step/end precedes turn/end', () => {
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      ev('assistant/chunk', { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'partial' } }, { seq: 3 }),
      ev('step/end', { turn: 1, step: 1 }, { seq: 4 }),
      endTurn(5, 1, 'aborted'),
    ])
    expect(view.latest!.status).toBe('aborted')
    expect(view.latest!.usage).toBeUndefined()
  })

  it('marks a message-less errored step failed even when step/end closed it', () => {
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      ev('step/end', { turn: 1, step: 1 }, { seq: 3 }),
      endTurn(4, 1, 'error'),
    ])
    expect(view.latest!.status).toBe('failed')
  })

  it('closes a step that ended with a message but whose turn crashed as completed', () => {
    // step/end fired and the step produced a message, but the turn never
    // ended (crash between step/end and turn/end): the step itself is
    // complete, so it is not the failed-orphan case.
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      message(3, 1, 1, usage(100, 50)),
      ev('step/end', { turn: 1, step: 1 }, { seq: 4 }),
      startStep(2, 1, 5),
      message(6, 2, 1, usage(100, 50)),
      endTurn(7, 2),
    ])
    expect(view.recentRequests.map(r => `${r.id}:${r.status}`)).toEqual(['1:1:completed', '2:1:completed'])
  })

  it('ignores a step/end that does not match the pending step', () => {
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      message(3, 1, 1, usage(100, 50)),
      ev('step/end', { turn: 1, step: 99 }, { seq: 4 }),
      endTurn(5, 1),
    ])
    expect(view.latest!.status).toBe('completed')
  })
})

describe('contextLens projection: surface estimate', () => {
  it('accumulates pre-step messages into the first request estimate', () => {
    const { view } = foldProjection([
      headerEvent(1),
      ev('user/message', userMessage([textBlock('a'.repeat(400))]), { seq: 2 }),
      startStep(1, 1, 3),
      message(4, 1, 1, usage(100, 50)),
      endTurn(5, 1),
    ])
    // 400 chars / 4 = 100 tokens + block overhead + role overhead.
    expect(view.latest!.estimatedSurfaceTokens).toBe(100 + 8)
  })

  it('prices in-step user and tool messages into the same request', () => {
    const { view } = foldProjection([
      startStep(1, 1, 1),
      ev('user/message', userMessage([textBlock('a'.repeat(400))]), { seq: 2 }),
      ev('tool/result', {
        turn: 1,
        step: 1,
        message: toolResultMessage('c1', [textBlock('b'.repeat(400))]),
      }, { seq: 3 }),
      message(4, 1, 1, usage(100, 50)),
      endTurn(5, 1),
    ])
    // User text message: 100 + block 4 + role 4. Tool result wraps one text
    // block in a tool-result block: 100 + 4 + 4 + role 4.
    expect(view.latest!.estimatedSurfaceTokens).toBe(108 + 112)
  })
})

describe('contextLens projection: retention and counters', () => {
  it('trims the retained window but keeps counting totals', () => {
    const events: SessionEvent[] = [headerEvent(1)]
    for (let turn = 1; turn <= MAX_RETAINED_REQUESTS + 5; turn++) {
      events.push(startStep(turn, 1, events.length + 1))
      events.push(message(events.length + 1, turn, 1, usage(100, 50)))
      events.push(endTurn(events.length + 1, turn))
    }
    const { view } = foldProjection(events)
    expect(view.recentRequests).toHaveLength(MAX_RETAINED_REQUESTS)
    expect(view.recentRequests[0]!.turn).toBe(6)
    expect(view.summary.totalRequests).toBe(MAX_RETAINED_REQUESTS + 5)
  })

  it('counts cache drops and structural changes', () => {
    const { view } = foldProjection([
      headerEvent(1),
      startStep(1, 1, 2),
      message(3, 1, 1, usage(2000, 100, { cacheReadTokens: 1800 })),
      endTurn(4, 1),
      headerEvent(5, headerB),
      startStep(2, 1, 6),
      message(7, 2, 1, usage(1000, 100, { cacheReadTokens: 0 })),
      endTurn(8, 2),
    ])
    expect(view.summary.cacheDrops).toBe(1)
    expect(view.summary.structuralChanges).toBe(1)
    expect(view.latest!.cache?.drop).toBe(true)
    expect(view.latest!.diffFromPrevious!.likelyCauses).toContain('tools-changed')
  })

  it('returns the same state reference for uninteresting events', () => {
    const first = foldProjection([headerEvent(1)])
    const untouched = contextLensProjectionDefinition.apply(first.state, ev('todo/write', { todos: [] }, { seq: 2 }))
    expect(untouched).toBe(first.state)
  })
})

describe('contextLens projection: replay consistency', () => {
  /**
   * The formal invariant: an incremental live fold (events applied one at a
   * time as they arrive) and a full replay fold (the same log folded from
   * `init`) must produce identical state and projection. The fold is pure
   * and synchronous, so this reduces to "folding N events equals folding N
   * events" — the test pins it against a log exercising every state
   * transition: multi-step turns, retries, abort, missing usage, late
   * usage, tool reorder, tool schema change, and model/config change.
   */
  const scenarioLog = (): SessionEvent[] => [
    headerEvent(1),
    ev('request/context', { provider: 'deepseek', model: 'deepseek-chat' }, { seq: 2 }),
    startStep(1, 1, 3),
    ev('user/message', userMessage([textBlock('a'.repeat(400))]), { seq: 4 }),
    ev('assistant/chunk', { turn: 1, step: 1, chunk: streamChunkUsage(usage(90, 10)) }, { seq: 5 }),
    headerEvent(6),
    message(7, 1, 1, usage(100, 50, { cacheReadTokens: 900 })),
    endTurn(8, 1),
    // Second step of the same turn, tool set extended + one schema changed.
    headerEvent(9, epochHeader('system-a', [toolSchema('tool-b'), toolSchema('tool-a', { extra: true })])),
    startStep(1, 2, 10),
    message(11, 1, 2, usage(1000, 100)),
    endTurn(12, 1, 'aborted'),
    // Model + provider + config change; usage arrives only on the final message.
    headerEvent(13, { config: { provider: 'openrouter', model: 'other-model' }, tools: [toolSchema('tool-a')] }),
    startStep(2, 1, 14),
    ev('assistant/message', { turn: 2, step: 1, message: assistantMessage([textBlock('no usage yet')]) }, { seq: 15 }),
    message(16, 2, 1, usage(200, 60, { cacheReadTokens: 300 })),
    endTurn(17, 2, 'error'),
    // Missing usage entirely.
    headerEvent(18, epochHeader('system-a', [toolSchema('x'), toolSchema('y')])),
    startStep(3, 1, 19),
    ev('assistant/message', { turn: 3, step: 1, message: assistantMessage([textBlock('no accounting')]) }, { seq: 20 }),
    endTurn(21, 3),
    // Tool order changed with identical set and schemas.
    headerEvent(22, epochHeader('system-a', [toolSchema('y'), toolSchema('x')])),
    startStep(4, 1, 23),
    message(24, 4, 1, usage(100, 50)),
    endTurn(25, 4),
    // Aborted before any message.
    startStep(5, 1, 26),
    endTurn(27, 5, 'aborted'),
  ]

  it('produces identical state and view under live and replay folds', () => {
    const log = scenarioLog()
    const replayed = foldProjection(log)
    let live: ContextLensState = contextLensProjectionDefinition.init()
    for (const event of log) {
      live = contextLensProjectionDefinition.apply(live, event)
    }
    expect(live).toEqual(replayed.state)
    expect(contextLensProjectionDefinition.view(live)).toEqual(replayed.view)
  })

  it('produces identical state when the log is folded in chunks', () => {
    const log = scenarioLog()
    const whole = foldProjection(log)
    let partial: ContextLensState = contextLensProjectionDefinition.init()
    for (const event of log.slice(0, 7)) partial = contextLensProjectionDefinition.apply(partial, event)
    for (const event of log.slice(7)) partial = contextLensProjectionDefinition.apply(partial, event)
    expect(partial).toEqual(whole.state)
  })

  it('records tool reorder and tool schema change distinctly across requests', () => {
    const { view } = foldProjection(scenarioLog())
    const byId = new Map(view.recentRequests.map(request => [request.id, request]))
    const first = byId.get('1:1')!
    const second = byId.get('1:2')!
    expect(first.diffFromPrevious).toBeUndefined()
    // Second request: tool-b added, tool-a modified (extra key), order [b, a].
    expect(second.diffFromPrevious!.tools.added).toEqual(['tool-b'])
    expect(second.diffFromPrevious!.tools.modified).toEqual(['tool-a'])
    // Third request (turn 2): model + provider + config changed.
    const third = byId.get('2:1')!
    expect(third.diffFromPrevious!.modelChanged).toBe(true)
    expect(third.diffFromPrevious!.providerChanged).toBe(true)
    expect(third.diffFromPrevious!.configChanged).toBe(true)
    // Fourth request (turn 3): missing usage, no drop reported.
    const fourth = byId.get('3:1')!
    expect(fourth.usage).toBeUndefined()
    expect(fourth.cache?.drop).toBe(false)
    // Fifth request (turn 4): same two tools, reversed order only.
    const fifth = byId.get('4:1')!
    expect(fifth.diffFromPrevious!.tools.added).toEqual([])
    expect(fifth.diffFromPrevious!.tools.removed).toEqual([])
    expect(fifth.diffFromPrevious!.tools.modified).toEqual([])
    expect(fifth.diffFromPrevious!.tools.orderChanged).toBe(true)
    expect(fifth.diffFromPrevious!.tools.changed).toBe(true)
  })

  it('decides statuses from the step events: message beats abort, then abort beats failure', () => {
    const { view } = foldProjection(scenarioLog())
    const byId = new Map(view.recentRequests.map(request => [request.id, request]))
    expect(byId.get('1:1')!.status).toBe('completed')
    expect(byId.get('1:2')!.status).toBe('completed')
    expect(byId.get('2:1')!.status).toBe('completed')
    expect(byId.get('3:1')!.status).toBe('completed')
    expect(byId.get('4:1')!.status).toBe('completed')
    expect(byId.get('5:1')!.status).toBe('aborted')
    expect(view.summary.totalRequests).toBe(6)
  })

  it('serves the view through the projection schema, exactly as the registry read path does', () => {
    // The real session-projection registry runs schema.parse on every
    // snapshot read; a view that fails it makes the projection unreadable
    // in the live runtime even though every field-level assertion passes.
    // Regression: the strict toolsDiffSchema once rejected the emitted
    // `orderChanged` field (caught by the real-runtime smoke).
    const { view } = foldProjection(scenarioLog())
    expect(() => contextLensProjectionDefinition.schema.parse(view)).not.toThrow()
    const noDiff = contextLensProjectionDefinition.view(foldProjection([
      ev('request/header', { header: epochHeader('system', [toolSchema('tool-a')]), reason: 'initial' }, { seq: 1 }),
      ev('request/context', { provider: 'p', model: 'm', contextWindow: 4096 }, { seq: 2 }),
      ev('step/start', { turn: 1, step: 1 }, { seq: 3 }),
      ev('assistant/message', {
        turn: 1,
        step: 1,
        message: assistantMessage([textBlock('ok')]),
        usage: usage(100, 10),
      }, { seq: 4 }),
      ev('turn/end', { turn: 1, reason: turnEndReason('completed') }, { seq: 5 }),
    ]).state)
    expect(() => contextLensProjectionDefinition.schema.parse(noDiff)).not.toThrow()
  })
})

describe('contextLens projection: determinism', () => {
  it('replays to the identical state and view', () => {
    const events: Parameters<typeof contextLensProjectionDefinition.apply>['1'][] = [
      headerEvent(1),
      startStep(1, 1, 2),
      ev('user/message', userMessage([textBlock('prompt')]), { seq: 3 }),
      message(4, 1, 1, usage(100, 50, { cacheReadTokens: 900 })),
      endTurn(5, 1),
      headerEvent(6, headerB),
      startStep(2, 1, 7),
      message(8, 2, 1, usage(100, 50)),
      endTurn(9, 2),
    ]
    const a = foldProjection(events)
    const b = foldProjection(events)
    expect(a.state).toEqual(b.state)
    expect(a.view).toEqual(b.view)
    expect(a.view.latest!.id).toBe('2:1')
  })

  it('prices the fingerprint header deterministically', () => {
    expect(fingerprintHeader(headerA)).toEqual(fingerprintHeader(headerA))
    expect(fingerprintHeader(headerA)).not.toEqual(fingerprintHeader(headerB))
  })
})
