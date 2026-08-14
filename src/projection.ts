/**
 * The `contextLens` session projection unit: a pure, replayable fold over
 * the session log that records one `RequestRecord` per real LLM request
 * (one `step/start` … `step/end` span). Context Lens compares committed,
 * model-observable request state — never the harness's mutable state and
 * never incidental runtime representation. The committed snapshot for one
 * request is the `request/header` in force at its `step/start`, replaced
 * when a header event lands inside the step before dispatch (the harness
 * appends `request/header` inside the step, so that event is the header the
 * provider actually saw). `request/header` is epoch-logged — appended only
 * on change — so a request without its own header event carries the latest
 * committed snapshot. Retries (`llm/retry`) stay inside the same step and
 * never mint a new record; the final `assistant/message` usage replaces any
 * earlier sample for the same step. Finalization: the loop always emits
 * `step/end` (even on error/abort) before `turn/end`; the last step of a
 * turn finalizes at `turn/end` with the turn's end reason, intermediate
 * steps finalize at the next `step/start` carrying the `step/end` marker,
 * and a crash-orphaned step (neither marker) closes as failed.
 *
 * @module dsh-context-lens/projection
 */

import { z } from 'zod'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { diffRequests } from './diff.ts'
import { observeCache } from './cache.ts'
import { estimateBlocksTokens, fingerprintHeader } from './fingerprint.ts'
import type {
  ContextLensProjection,
  ContextLensSummary,
  HeaderFingerprint,
  RequestRecord,
  RequestUsage,
} from './types.ts'

/** The role-framing overhead priced into every surface message. */
const ROLE_OVERHEAD = 4

/** How many finalized requests the retained window keeps (newest last). */
export const MAX_RETAINED_REQUESTS = 100

/** How a turn ended — narrowed from `turn/end` for the status decision. */
type TurnEndKind = 'aborted' | 'error' | 'other'

/** A `step/start` … `step/end` span still being observed. */
interface PendingRequest {
  turn: number
  step: number
  seq: number
  time: number
  /** Header in force at `step/start`, replaced when `request/header` lands inside the step. */
  header: HeaderFingerprint | null
  contextWindow?: number
  sawMessage: boolean
  /** Whether the loop closed the step with `step/end` (it always does, even on error/abort). */
  stepEnded: boolean
  usage?: RequestUsage
  /** Heuristic surface estimate accumulated before this step started. */
  surfaceAtStart: number
  /** Heuristic estimate of this step's own `user/message` surface additions. */
  surfaceTokens: number
  turnEnd?: TurnEndKind
}

/** The projection's internal state — plain JSON, replay-stable. */
export interface ContextLensState {
  pending: PendingRequest | null
  last: RequestRecord | null
  requests: RequestRecord[]
  totalRequests: number
  cacheDrops: number
  structuralChanges: number
  /** Header fingerprint in force between requests (epoch semantics). */
  epoch: HeaderFingerprint | null
  epochContext?: { provider: string; model: string; contextWindow?: number }
  /** Heuristic running total of every surface message so far (bytes → tokens). */
  surfaceCarry: number
}

const summarySchema = z.object({
  totalRequests: z.number().int().nonnegative(),
  cacheDrops: z.number().int().nonnegative(),
  structuralChanges: z.number().int().nonnegative(),
}).strict()

const toolFingerprintSchema = z.object({
  name: z.string(),
  schemaHash: z.string(),
  schemaBytes: z.number().int().nonnegative(),
  estimatedTokens: z.number().int().nonnegative(),
}).strict()

const headerFingerprintSchema = z.object({
  configHash: z.string(),
  provider: z.string().optional(),
  model: z.string().optional(),
  systemHash: z.string().optional(),
  systemBytes: z.number().int().nonnegative().optional(),
  toolsHash: z.string().optional(),
  toolCount: z.number().int().nonnegative().optional(),
  tools: z.array(toolFingerprintSchema),
}).strict()

const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),
  reasoningTokens: z.number().int().nonnegative().optional(),
}).strict()

const cacheObservationSchema = z.object({
  reuse: z.number().min(0).max(1).optional(),
  billedInputTokens: z.number().int().nonnegative().optional(),
  previousReuse: z.number().min(0).max(1).optional(),
  deltaPoints: z.number().optional(),
  drop: z.boolean(),
}).strict()

const systemDiffSchema = z.object({
  changed: z.boolean(),
  beforeBytes: z.number().int().nonnegative().optional(),
  afterBytes: z.number().int().nonnegative().optional(),
}).strict()

const toolsDiffSchema = z.object({
  changed: z.boolean(),
  added: z.array(z.string()),
  removed: z.array(z.string()),
  modified: z.array(z.string()),
  // Tool declaration order is a first-class committed change (model-observable).
  orderChanged: z.boolean(),
}).strict()

const likelyCauseSchema = z.enum([
  'model-or-provider-changed',
  'system-changed',
  'tools-changed',
  'config-changed',
  'surface-grew',
  'no-obvious-change',
])

const requestDiffSchema = z.object({
  modelChanged: z.boolean(),
  providerChanged: z.boolean(),
  configChanged: z.boolean(),
  system: systemDiffSchema,
  tools: toolsDiffSchema,
  surface: z.object({ estimatedDeltaTokens: z.number().optional() }).strict(),
  cache: z.object({
    previousHitRate: z.number(),
    currentHitRate: z.number(),
    deltaPoints: z.number().optional(),
  }).strict().optional(),
  likelyCauses: z.array(likelyCauseSchema).optional(),
}).strict()

const requestRecordSchema = z.object({
  id: z.string(),
  turn: z.number().int().positive(),
  step: z.number().int().positive(),
  seq: z.number().int().nonnegative(),
  time: z.number(),
  status: z.enum(['completed', 'failed', 'aborted']),
  provider: z.string().optional(),
  model: z.string().optional(),
  contextWindow: z.number().int().positive().optional(),
  header: headerFingerprintSchema,
  usage: usageSchema.optional(),
  estimatedSurfaceTokens: z.number().int().nonnegative(),
  cache: cacheObservationSchema.optional(),
  diffFromPrevious: requestDiffSchema.optional(),
}).strict()

const projectionSchema = z.object({
  latest: requestRecordSchema.optional(),
  recentRequests: z.array(requestRecordSchema),
  summary: summarySchema,
}).strict() as unknown as z.ZodType<ContextLensProjection>

const emptySummary = (): ContextLensSummary => ({ totalRequests: 0, cacheDrops: 0, structuralChanges: 0 })

const usageFrom = (usage: TokenUsage): RequestUsage => ({
  inputTokens: usage.inputTokens,
  outputTokens: usage.outputTokens,
  ...usage.cacheReadTokens === undefined ? {} : { cacheReadTokens: usage.cacheReadTokens },
  ...usage.cacheWriteTokens === undefined ? {} : { cacheWriteTokens: usage.cacheWriteTokens },
  ...usage.reasoningTokens === undefined ? {} : { reasoningTokens: usage.reasoningTokens },
})

/** The turn-end kind, if the event is a `turn/end`. */
const turnEndKindOf = (event: SessionEvent): TurnEndKind | undefined =>
  event.type !== 'turn/end' ? undefined
    : event.data.reason.kind === 'aborted' ? 'aborted'
      : event.data.reason.kind === 'error' ? 'error'
        : 'other'

/** Build the finalized record for a completed step and fold it into the state. */
function finalize(state: ContextLensState, pending: PendingRequest): ContextLensState {
  const header = pending.header ?? state.epoch
  const usage = pending.usage
  const provider = header?.provider ?? state.epochContext?.provider
  const model = header?.model ?? state.epochContext?.model
  const record: RequestRecord = {
    id: `${pending.turn}:${pending.step}`,
    turn: pending.turn,
    step: pending.step,
    seq: pending.seq,
    time: pending.time,
    // A message plus a closed step (`step/end`) or an ended turn finalizes
    // completed; an aborted turn without a message is aborted; everything
    // else — an error turn, or a crash-orphaned step with neither marker —
    // is failed. The loop always emits `step/end` before `turn/end`, so an
    // intermediate step of a multi-step turn finalizes at the next
    // `step/start` with `stepEnded` set.
    status: pending.sawMessage && (pending.turnEnd !== undefined || pending.stepEnded) ? 'completed'
      : pending.turnEnd === 'aborted' ? 'aborted'
        : 'failed',
    ...provider === undefined ? {} : { provider },
    ...model === undefined ? {} : { model },
    ...pending.contextWindow !== undefined ? { contextWindow: pending.contextWindow } : {},
    header: header ?? { configHash: '', tools: [] },
    ...usage === undefined ? {} : { usage },
    estimatedSurfaceTokens: pending.surfaceAtStart + pending.surfaceTokens,
    ...observeCacheSafe(usage, state.last?.usage),
  }
  const diff = state.last == null ? undefined : diffRequests(state.last, record)
  const stored = diff === undefined ? record : { ...record, diffFromPrevious: diff }
  const structural = diff !== undefined && (
    diff.tools.changed || diff.system.changed || diff.modelChanged
    || diff.providerChanged || diff.configChanged
  )
  const requests = [...state.requests, stored]
  if (requests.length > MAX_RETAINED_REQUESTS) requests.splice(0, requests.length - MAX_RETAINED_REQUESTS)
  return {
    ...state,
    pending: null,
    last: stored,
    requests,
    totalRequests: state.totalRequests + 1,
    cacheDrops: state.cacheDrops + (record.cache?.drop === true ? 1 : 0),
    structuralChanges: state.structuralChanges + (structural ? 1 : 0),
  }
}

/** Keep the record construction readable: absent usage must still produce a cache observation. */
function observeCacheSafe(
  usage: RequestUsage | undefined,
  previousUsage: RequestUsage | undefined,
): Pick<RequestRecord, 'cache'> {
  const cache = observeCache(usage, previousUsage)
  const hasPayload = cache.reuse !== undefined || cache.billedInputTokens !== undefined
  return { cache: hasPayload ? cache : { drop: false } }
}

/**
 * The `contextLens` projection unit. The fold is fully synchronous and pure;
 * uninteresting events return the same state reference (the registry's
 * zero-work `Object.is` gate).
 */
export const contextLensProjectionDefinition:
ProjectionDefinition<'contextLens', ContextLensState> = {
  key: 'contextLens',
  schema: projectionSchema,
  init: () => ({
    pending: null,
    last: null,
    requests: [],
    totalRequests: 0,
    cacheDrops: 0,
    structuralChanges: 0,
    epoch: null,
    surfaceCarry: 0,
  }),
  apply: (state, event) => {
    switch (event.type) {
      case 'request/header': {
        const epoch = fingerprintHeader(event.data.header)
        return state.pending === null
          ? { ...state, epoch }
          : { ...state, epoch, pending: { ...state.pending, header: epoch } }
      }
      case 'request/context': {
        const { provider, model, contextWindow } = event.data
        const epochContext = { provider, model, ...contextWindow === undefined ? {} : { contextWindow } }
        return {
          ...state,
          epochContext,
          ...state.pending === null ? {} : {
            pending: { ...state.pending, ...contextWindow === undefined ? {} : { contextWindow } },
          },
        }
      }
      case 'step/start': {
        // A stale pending (a step that never ended, e.g. a crash-orphaned
        // log) closes as failed before the next step opens.
        const base = state.pending === null ? state : finalize(state, state.pending)
        return {
          ...base,
          pending: {
            turn: event.data.turn,
            step: event.data.step,
            seq: event.seq,
            time: event.time,
            header: base.epoch,
            ...base.epochContext?.contextWindow === undefined ? {} : { contextWindow: base.epochContext.contextWindow },
            sawMessage: false,
            stepEnded: false,
            surfaceAtStart: base.surfaceCarry,
            surfaceTokens: 0,
          },
        }
      }
      case 'step/end': {
        // The loop closes every step with `step/end` (always, even on
        // error/abort, before `turn/end`). Mark the pending span closed so a
        // later finalization can tell a cleanly ended step from a crash
        // orphan; finalization itself still happens at `turn/end` or at the
        // next `step/start`.
        if (state.pending === null) return state
        const pending = state.pending
        if (pending.turn !== event.data.turn || pending.step !== event.data.step) return state
        return { ...state, pending: { ...pending, stepEnded: true } }
      }
      case 'user/message': {
        if (state.pending === null) {
          return { ...state, surfaceCarry: state.surfaceCarry + estimateBlocksTokens(event.data.content) + ROLE_OVERHEAD }
        }
        const delta = estimateBlocksTokens(event.data.content) + ROLE_OVERHEAD
        return {
          ...state,
          pending: { ...state.pending, surfaceTokens: state.pending.surfaceTokens + delta },
          surfaceCarry: state.surfaceCarry + delta,
        }
      }
      case 'assistant/chunk': {
        if (event.data.chunk.type !== 'usage' || state.pending === null) return state
        return { ...state, pending: { ...state.pending, usage: usageFrom(event.data.chunk.usage) } }
      }
      case 'assistant/message': {
        if (state.pending === null) {
          return { ...state, surfaceCarry: state.surfaceCarry + estimateBlocksTokens(event.data.message.content) + ROLE_OVERHEAD }
        }
        const pending: PendingRequest = {
          ...state.pending,
          sawMessage: true,
          ...event.data.usage === undefined ? {} : { usage: usageFrom(event.data.usage) },
        }
        return {
          ...state,
          pending,
          surfaceCarry: state.surfaceCarry + estimateBlocksTokens(event.data.message.content) + ROLE_OVERHEAD,
        }
      }
      case 'tool/result': {
        const delta = estimateBlocksTokens(event.data.message.content) + ROLE_OVERHEAD
        if (state.pending === null) {
          return { ...state, surfaceCarry: state.surfaceCarry + delta }
        }
        return {
          ...state,
          pending: { ...state.pending, surfaceTokens: state.pending.surfaceTokens + delta },
          surfaceCarry: state.surfaceCarry + delta,
        }
      }
      case 'turn/end': {
        if (state.pending === null) return state
        const turnEnd = turnEndKindOf(event) ?? 'other'
        return finalize(state, { ...state.pending, turnEnd })
      }
      default:
        return state
    }
  },
  view: state => ({
    ...state.last === null ? {} : { latest: state.last },
    recentRequests: state.requests,
    summary: {
      totalRequests: state.totalRequests,
      cacheDrops: state.cacheDrops,
      structuralChanges: state.structuralChanges,
    },
  }),
  // 2: schemaBytes is UTF-8 byte length (was JS string length).
  stateVersion: 2,
}
