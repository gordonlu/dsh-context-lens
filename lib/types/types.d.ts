/**
 * dsh-context-lens domain types: the projection's wire payload, one request
 * record, and the per-request diff/cache observations. The `contextLens` key
 * is declared into the framework's merge-extensible `SessionProjectionMap`,
 * so the projection value rides the official projection wire (history
 * baselines + `session/projection` push frames) with no custom transport.
 *
 * @module dsh-context-lens/types
 */
/**
 * One tool's identity fingerprint: stable name, canonical schema hash, byte
 * size, and a heuristic token estimate. The schema text itself is never
 * retained.
 */
export interface ToolFingerprint {
    name: string;
    schemaHash: string;
    schemaBytes: number;
    estimatedTokens: number;
}
/**
 * The fingerprint of the request header in force for one request: the call
 * config, system prompt, and tool set, reduced to hashes and sizes. No
 * prompt or schema text is retained (see README privacy notes).
 */
export interface HeaderFingerprint {
    configHash: string;
    provider?: string;
    model?: string;
    systemHash?: string;
    systemBytes?: number;
    /** Hash of the whole canonical tool set; absent when no tools were present. */
    toolsHash?: string;
    toolCount?: number;
    tools: ToolFingerprint[];
}
/** How one request turned out, decided from the step's own events. */
export type RequestStatus = 'completed' | 'failed' | 'aborted';
/**
 * Provider-reported usage for one request, normalized to the harness
 * `TokenUsage` semantics: `inputTokens` is uncached input only; cached input
 * is reported separately. Absent fields mean the provider reported none —
 * never zero.
 */
export interface RequestUsage {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
}
/**
 * Cache-reuse observation for one request, computed strictly from the
 * provider's disjoint usage buckets: reuse = cache reads / billed input
 * (uncached input + cache reads + cache writes).
 */
export interface CacheObservation {
    /** Cache reuse as a ratio in [0, 1]; absent when usage or reads are unavailable. */
    reuse?: number;
    /** Billed input = uncached input + cache reads + cache writes. */
    billedInputTokens?: number;
    /** The previous request's reuse ratio, when it had one. */
    previousReuse?: number;
    /** Current minus previous reuse, in percentage points. */
    deltaPoints?: number;
    /** Whether this request's reuse dropped past the alarm threshold. */
    drop: boolean;
}
/**
 * Deterministic, rule-ranked list of request changes that coincide with a
 * cache drop. Correlation only — never causation.
 */
export type LikelyCause = 'model-or-provider-changed' | 'system-changed' | 'tools-changed' | 'config-changed' | 'surface-grew' | 'no-obvious-change';
/**
 * What changed between the previous request and this one. `tools` is derived
 * by name over both tool fingerprints (set membership, schema hashes, and
 * declaration order — order is model-observable because it reaches the
 * provider's serialization and can shift the prefix cache); `surface` is the
 * heuristic estimate of conversation-surface growth; `cache` mirrors the
 * current observation when both requests reported usage.
 */
export interface RequestDiff {
    modelChanged: boolean;
    providerChanged: boolean;
    configChanged: boolean;
    system: {
        changed: boolean;
        beforeBytes?: number;
        afterBytes?: number;
    };
    tools: {
        changed: boolean;
        added: string[];
        removed: string[];
        modified: string[];
        /** Same set and schemas, but the final request declared them in a different order. */
        orderChanged: boolean;
    };
    surface: {
        estimatedDeltaTokens?: number;
    };
    cache?: {
        previousHitRate?: number;
        currentHitRate?: number;
        deltaPoints?: number;
    };
    likelyCauses?: LikelyCause[];
}
/**
 * Cumulative session counters. They keep counting past the retained-window
 * trim (the newest 100 records), so `totalRequests` can exceed the window
 * length — the counts are session-level, the records window-level.
 */
export interface ContextLensSummary {
    totalRequests: number;
    cacheDrops: number;
    structuralChanges: number;
    /**
     * Session-global ordinal of the most recent cache drop (1-based; 0 when
     * none happened yet). Health is windowed: the session is unstable only
     * while this lies within the recent window.
     */
    lastDropOrdinal: number;
}
/**
 * The projection value for the `contextLens` key: the latest request, the
 * most recent requests (bounded — see {@link MAX_RETAINED_REQUESTS}), and
 * the session summary.
 */
export interface ContextLensProjection {
    latest?: RequestRecord;
    recentRequests: RequestRecord[];
    summary: ContextLensSummary;
}
/**
 * One observed LLM request — the product's unit of analysis. Context Lens
 * compares committed, model-observable request state — not incidental
 * runtime representation: `header` is the fingerprint of the request header
 * actually committed to this request (`request/header` is appended inside
 * the step before dispatch, so the header in force at `step/start` — or the
 * header event that lands inside the step — is what the provider saw). The
 * harness's mutable state never participates directly; `request/header` and
 * the request lifecycle are the sole facts. `usage` is the request's final
 * provider accounting; `estimatedSurfaceTokens` is the heuristic
 * conversation-surface estimate; `cache` and `diffFromPrevious` are computed
 * at finalization, so the record is immutable after it lands.
 */
export interface RequestRecord {
    /** `turn:step` — one record per model call, never per message or chunk. */
    id: string;
    turn: number;
    step: number;
    /** Seq of the `step/start` event. */
    seq: number;
    /** Time of the `step/start` event (from the log, replay-stable). */
    time: number;
    status: RequestStatus;
    provider?: string;
    model?: string;
    /** Advertised context capacity in force at the request, when known. */
    contextWindow?: number;
    header: HeaderFingerprint;
    usage?: RequestUsage;
    estimatedSurfaceTokens: number;
    cache?: CacheObservation;
    diffFromPrevious?: RequestDiff;
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionMap {
        contextLens: ContextLensProjection;
    }
}
