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
 * earlier sample for the same step.
 *
 * @module dsh-context-lens/projection
 */
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection';
import type { HeaderFingerprint, RequestRecord, RequestUsage } from './types.ts';
/** How many finalized requests the retained window keeps (newest last). */
export declare const MAX_RETAINED_REQUESTS = 100;
/** How a turn ended — narrowed from `turn/end` for the status decision. */
type TurnEndKind = 'aborted' | 'error' | 'other';
/** A `step/start` … `step/end` span still being observed. */
interface PendingRequest {
    turn: number;
    step: number;
    seq: number;
    time: number;
    /** Header in force at `step/start`, replaced when `request/header` lands inside the step. */
    header: HeaderFingerprint | null;
    contextWindow?: number;
    sawMessage: boolean;
    usage?: RequestUsage;
    /** Heuristic surface estimate accumulated before this step started. */
    surfaceAtStart: number;
    /** Heuristic estimate of this step's own `user/message` surface additions. */
    surfaceTokens: number;
    turnEnd?: TurnEndKind;
}
/** The projection's internal state — plain JSON, replay-stable. */
export interface ContextLensState {
    pending: PendingRequest | null;
    last: RequestRecord | null;
    requests: RequestRecord[];
    totalRequests: number;
    cacheDrops: number;
    structuralChanges: number;
    /** Header fingerprint in force between requests (epoch semantics). */
    epoch: HeaderFingerprint | null;
    epochContext?: {
        provider: string;
        model: string;
        contextWindow?: number;
    };
    /** Heuristic running total of every surface message so far (bytes → tokens). */
    surfaceCarry: number;
}
/**
 * The `contextLens` projection unit. The fold is fully synchronous and pure;
 * uninteresting events return the same state reference (the registry's
 * zero-work `Object.is` gate).
 */
export declare const contextLensProjectionDefinition: ProjectionDefinition<'contextLens', ContextLensState>;
export {};
