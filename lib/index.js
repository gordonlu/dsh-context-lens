import { z } from "zod";
import { createHash } from "node:crypto";
/**
* Billed input tokens of one request: uncached input plus cache reads plus
* cache writes.
* @param usage - the request's provider usage.
* @returns the billed input total.
*/
function billedInputTokens(usage) {
	return usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
}
/**
* Cache reuse ratio of one request: cache reads divided by billed input.
* @param usage - the request's provider usage.
* @returns the reuse ratio in [0, 1], or undefined when usage or cache reads
*   are unavailable (missing fields are never treated as zero).
*/
function cacheReuse(usage) {
	const billed = billedInputTokens(usage);
	if (usage.cacheReadTokens === void 0 || billed === 0) return void 0;
	return usage.cacheReadTokens / billed;
}
/**
* Whether a surface growth of `deltaTokens` over the previous request is
* large enough to be cache-relevant: at least the absolute alarm size, or at
* least the fraction alarm of the previous billed input when that is known.
* @param previousBilledInput - the previous request's billed input, when known.
* @param deltaTokens - the estimated surface growth.
* @returns true when the growth is flagged.
*/
function surfaceGrowthAlarm(previousBilledInput, deltaTokens) {
	if (deltaTokens < 0) return false;
	if (deltaTokens >= 1e3) return true;
	return previousBilledInput !== void 0 && deltaTokens >= .2 * previousBilledInput;
}
/**
* Build one request's cache observation against the previous request's
* usage. A drop is flagged only when both requests reported comparable
* reuse, the previous request was large enough to mean something, and the
* delta crossed the threshold. Absent data yields no reuse, no delta, and
* never a drop.
* @param usage - the current request's provider usage, or undefined when it reported none.
* @param previousUsage - the previous request's provider usage, or undefined.
* @returns the observation.
*/
function observeCache(usage, previousUsage) {
	if (usage === void 0) return { drop: false };
	const billed = billedInputTokens(usage);
	const reuse = cacheReuse(usage);
	if (reuse === void 0) return {
		billedInputTokens: billed,
		drop: false
	};
	const previousReuse = previousUsage === void 0 ? void 0 : cacheReuse(previousUsage);
	const previousBilled = previousUsage === void 0 ? void 0 : billedInputTokens(previousUsage);
	const deltaPoints = previousReuse === void 0 ? void 0 : (reuse - previousReuse) * 100;
	const drop = previousReuse !== void 0 && (previousBilled ?? 0) >= 1e3 && (deltaPoints ?? 0) <= -20;
	return {
		reuse,
		billedInputTokens: billed,
		...previousReuse === void 0 ? {} : { previousReuse },
		...deltaPoints === void 0 ? {} : { deltaPoints },
		drop
	};
}
//#endregion
//#region src/diff.ts
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
/**
* Diff one request against the previous one. `likelyCauses` is populated
* only when the current request's cache reuse dropped, and lists the request
* changes observed at the same boundary in a fixed rule order — correlation,
* never causation.
* @param previous - the previous finalized request, or undefined for the first.
* @param current - the newly finalized request.
* @returns the diff.
*/
function diffRequests(previous, current) {
	const providerChanged = previous !== void 0 && previous.provider !== current.provider;
	const modelChanged = previous !== void 0 && previous.model !== current.model;
	const configChanged = previous !== void 0 && previous.header.configHash !== current.header.configHash;
	const system = diffSystem(previous, current);
	const tools = diffTools(previous, current);
	const surfaceDelta = previous === void 0 ? void 0 : current.estimatedSurfaceTokens - previous.estimatedSurfaceTokens;
	const currentReuse = current.cache?.reuse;
	const previousReuse = current.cache?.previousReuse;
	const deltaPoints = current.cache?.deltaPoints;
	const diff = {
		modelChanged,
		providerChanged,
		configChanged,
		system,
		tools,
		surface: { ...surfaceDelta === void 0 ? {} : { estimatedDeltaTokens: surfaceDelta } },
		...currentReuse !== void 0 && previousReuse !== void 0 ? { cache: {
			previousHitRate: previousReuse * 100,
			currentHitRate: currentReuse * 100,
			...deltaPoints === void 0 ? {} : { deltaPoints }
		} } : {}
	};
	if (previous !== void 0 && current.cache?.drop === true) diff.likelyCauses = likelyCauses(diff, previous, surfaceDelta);
	return diff;
}
/** The system-prompt part of a request diff: changed plus byte sizes when known. */
function diffSystem(previous, current) {
	if (previous === void 0) return { changed: false };
	const changed = previous.header.systemHash !== current.header.systemHash;
	return {
		changed,
		...changed && previous.header.systemBytes !== void 0 ? { beforeBytes: previous.header.systemBytes } : {},
		...changed && current.header.systemBytes !== void 0 ? { afterBytes: current.header.systemBytes } : {}
	};
}
/** The tool-set part of a request diff, derived by name over both fingerprints. */
function diffTools(previous, current) {
	if (previous === void 0) return {
		changed: false,
		added: [],
		removed: [],
		modified: [],
		orderChanged: false
	};
	const previousByName = new Map(previous.header.tools.map((tool) => [tool.name, tool]));
	const currentByName = new Map(current.header.tools.map((tool) => [tool.name, tool]));
	const added = [];
	const removed = [];
	const modified = [];
	for (const [name, tool] of currentByName) {
		const before = previousByName.get(name);
		if (before === void 0) added.push(name);
		else if (before.schemaHash !== tool.schemaHash) modified.push(name);
	}
	for (const name of previousByName.keys()) if (!currentByName.has(name)) removed.push(name);
	added.sort();
	removed.sort();
	modified.sort();
	const orderChanged = added.length === 0 && removed.length === 0 && previous.header.tools.some((tool, index) => current.header.tools[index]?.name !== tool.name);
	return {
		changed: added.length > 0 || removed.length > 0 || modified.length > 0 || orderChanged,
		added,
		removed,
		modified,
		orderChanged
	};
}
/**
* Rule-ranked candidate causes for a cache drop, in fixed priority order:
* provider/model, system, tools, config, surface growth, then the fallback.
* @param diff - the request diff.
* @param previous - the previous request.
* @param surfaceDelta - the estimated surface delta.
* @returns the ranked cause list.
*/
function likelyCauses(diff, previous, surfaceDelta) {
	const causes = [];
	if (diff.providerChanged || diff.modelChanged) causes.push("model-or-provider-changed");
	if (diff.system.changed) causes.push("system-changed");
	if (diff.tools.changed) causes.push("tools-changed");
	if (diff.configChanged) causes.push("config-changed");
	const previousBilled = previous.cache?.billedInputTokens;
	if (surfaceDelta !== void 0 && surfaceGrowthAlarm(previousBilled, surfaceDelta)) causes.push("surface-grew");
	if (causes.length === 0) causes.push("no-obvious-change");
	return causes;
}
/**
* Deterministically serialize any JSON value: object keys are sorted
* recursively, arrays keep their order, primitives are verbatim. A stable
* serialization is the precondition for stable hashes — key order changes
* must not register as a schema change.
* @param value - the JSON value to serialize.
* @returns the canonical JSON text.
*/
function canonicalJson(value) {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
	const record = value;
	return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}
/**
* sha256 hex digest of a text.
* @param text - the text to hash.
* @returns the hex digest.
*/
function hashText(text) {
	return createHash("sha256").update(text, "utf8").digest("hex");
}
/**
* Hash of the canonical serialization of a JSON value.
* @param value - the JSON value to hash.
* @returns the hex digest.
*/
function hashValue(value) {
	return hashText(canonicalJson(value));
}
/**
* Heuristic token price of a tool schema under the fixed density.
* @param schema - the tool schema to price.
* @returns the heuristic token count.
*/
function estimateSchemaTokens(schema) {
	return Math.ceil(JSON.stringify(schema).length / 4) + 4;
}
/**
* Heuristic token price of one content block, mirroring the harness
* token-meter heuristic (4 chars per token plus per-block overhead;
* unknown block types fall back to a conservative structural JSON price).
* @param block - the block to price.
* @returns the heuristic token count.
*/
function estimateBlockTokens(block) {
	switch (block.type) {
		case "text":
		case "reasoning": return Math.ceil(block.text.length / 4) + 4;
		case "tool-call": return Math.ceil(block.name.length / 4) + Math.ceil(block.arguments.length / 4) + 4;
		case "tool-result": return estimateBlocksTokens(block.content) + 4;
		default: return 4 + Math.ceil(JSON.stringify(block).length / 4);
	}
}
/**
* Heuristic token price of a block list.
* @param blocks - the blocks to price.
* @returns the heuristic token count.
*/
function estimateBlocksTokens(blocks) {
	let tokens = 0;
	for (const block of blocks) tokens += estimateBlockTokens(block);
	return tokens;
}
/** Fingerprint of an absent header: no config hash, empty tool set. */
const EMPTY_HEADER = {
	configHash: "",
	tools: []
};
/**
* Reduce a canonical request header to its fingerprint. `undefined` (a
* header-less log) yields {@link EMPTY_HEADER}. The system text is hashed and
* measured in bytes; every tool is fingerprinted individually, and the tool
* set carries a whole-set hash for O(1) change detection.
* @param header - the canonical header, or undefined before any request.
* @returns the fingerprint.
*/
function fingerprintHeader(header) {
	if (header === void 0) return EMPTY_HEADER;
	const tools = (header.tools ?? []).map((schema) => {
		const canonical = canonicalJson(schema);
		return {
			name: schema.name,
			schemaHash: hashText(canonical),
			schemaBytes: Buffer.byteLength(canonical, "utf8"),
			estimatedTokens: estimateSchemaTokens(schema)
		};
	});
	return {
		configHash: hashValue(header.config),
		...header.config.provider === void 0 ? {} : { provider: header.config.provider },
		...header.config.model === void 0 ? {} : { model: header.config.model },
		...header.system === void 0 ? {} : {
			systemHash: hashText(header.system),
			systemBytes: Buffer.byteLength(header.system, "utf8")
		},
		...tools.length === 0 ? {} : {
			toolsHash: hashValue(tools.map((tool) => [tool.name, tool.schemaHash])),
			toolCount: tools.length
		},
		tools
	};
}
//#endregion
//#region src/projection.ts
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
/** The role-framing overhead priced into every surface message. */
const ROLE_OVERHEAD = 4;
const summarySchema = z.object({
	totalRequests: z.number().int().nonnegative(),
	cacheDrops: z.number().int().nonnegative(),
	structuralChanges: z.number().int().nonnegative(),
	lastDropOrdinal: z.number().int().nonnegative().default(0)
}).strict();
const toolFingerprintSchema = z.object({
	name: z.string(),
	schemaHash: z.string(),
	schemaBytes: z.number().int().nonnegative(),
	estimatedTokens: z.number().int().nonnegative()
}).strict();
const headerFingerprintSchema = z.object({
	configHash: z.string(),
	provider: z.string().optional(),
	model: z.string().optional(),
	systemHash: z.string().optional(),
	systemBytes: z.number().int().nonnegative().optional(),
	toolsHash: z.string().optional(),
	toolCount: z.number().int().nonnegative().optional(),
	tools: z.array(toolFingerprintSchema)
}).strict();
const usageSchema = z.object({
	inputTokens: z.number().int().nonnegative(),
	outputTokens: z.number().int().nonnegative(),
	cacheReadTokens: z.number().int().nonnegative().optional(),
	cacheWriteTokens: z.number().int().nonnegative().optional(),
	reasoningTokens: z.number().int().nonnegative().optional()
}).strict();
const cacheObservationSchema = z.object({
	reuse: z.number().min(0).max(1).optional(),
	billedInputTokens: z.number().int().nonnegative().optional(),
	previousReuse: z.number().min(0).max(1).optional(),
	deltaPoints: z.number().optional(),
	drop: z.boolean()
}).strict();
const systemDiffSchema = z.object({
	changed: z.boolean(),
	beforeBytes: z.number().int().nonnegative().optional(),
	afterBytes: z.number().int().nonnegative().optional()
}).strict();
const toolsDiffSchema = z.object({
	changed: z.boolean(),
	added: z.array(z.string()),
	removed: z.array(z.string()),
	modified: z.array(z.string()),
	orderChanged: z.boolean()
}).strict();
const likelyCauseSchema = z.enum([
	"model-or-provider-changed",
	"system-changed",
	"tools-changed",
	"config-changed",
	"surface-grew",
	"no-obvious-change"
]);
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
		deltaPoints: z.number().optional()
	}).strict().optional(),
	likelyCauses: z.array(likelyCauseSchema).optional()
}).strict();
const requestRecordSchema = z.object({
	id: z.string(),
	turn: z.number().int().positive(),
	step: z.number().int().positive(),
	seq: z.number().int().nonnegative(),
	time: z.number(),
	status: z.enum([
		"completed",
		"failed",
		"aborted"
	]),
	provider: z.string().optional(),
	model: z.string().optional(),
	contextWindow: z.number().int().positive().optional(),
	header: headerFingerprintSchema,
	usage: usageSchema.optional(),
	estimatedSurfaceTokens: z.number().int().nonnegative(),
	cache: cacheObservationSchema.optional(),
	diffFromPrevious: requestDiffSchema.optional()
}).strict();
const projectionSchema = z.object({
	latest: requestRecordSchema.optional(),
	recentRequests: z.array(requestRecordSchema),
	summary: summarySchema
}).strict();
const usageFrom = (usage) => ({
	inputTokens: usage.inputTokens,
	outputTokens: usage.outputTokens,
	...usage.cacheReadTokens === void 0 ? {} : { cacheReadTokens: usage.cacheReadTokens },
	...usage.cacheWriteTokens === void 0 ? {} : { cacheWriteTokens: usage.cacheWriteTokens },
	...usage.reasoningTokens === void 0 ? {} : { reasoningTokens: usage.reasoningTokens }
});
/** The turn-end kind, if the event is a `turn/end`. */
const turnEndKindOf = (event) => event.type !== "turn/end" ? void 0 : event.data.reason.kind === "aborted" ? "aborted" : event.data.reason.kind === "error" ? "error" : "other";
/** Build the finalized record for a completed step and fold it into the state. */
function finalize(state, pending) {
	const header = pending.header ?? state.epoch;
	const usage = pending.usage;
	const provider = header?.provider ?? state.epochContext?.provider;
	const model = header?.model ?? state.epochContext?.model;
	const record = {
		id: `${pending.turn}:${pending.step}`,
		turn: pending.turn,
		step: pending.step,
		seq: pending.seq,
		time: pending.time,
		status: pending.sawMessage && (pending.turnEnd !== void 0 || pending.stepEnded) ? "completed" : pending.turnEnd === "aborted" ? "aborted" : "failed",
		...provider === void 0 ? {} : { provider },
		...model === void 0 ? {} : { model },
		...pending.contextWindow !== void 0 ? { contextWindow: pending.contextWindow } : {},
		header: header ?? {
			configHash: "",
			tools: []
		},
		...usage === void 0 ? {} : { usage },
		estimatedSurfaceTokens: pending.surfaceAtStart + pending.surfaceTokens,
		...observeCacheSafe(usage, state.last?.usage)
	};
	const diff = state.last == null ? void 0 : diffRequests(state.last, record);
	const stored = diff === void 0 ? record : {
		...record,
		diffFromPrevious: diff
	};
	const structural = diff !== void 0 && (diff.tools.changed || diff.system.changed || diff.modelChanged || diff.providerChanged || diff.configChanged);
	const requests = [...state.requests, stored];
	if (requests.length > 100) requests.splice(0, requests.length - 100);
	return {
		...state,
		pending: null,
		last: stored,
		requests,
		totalRequests: state.totalRequests + 1,
		cacheDrops: state.cacheDrops + (record.cache?.drop === true ? 1 : 0),
		structuralChanges: state.structuralChanges + (structural ? 1 : 0),
		lastDropOrdinal: record.cache?.drop === true ? state.totalRequests + 1 : state.lastDropOrdinal
	};
}
/** Keep the record construction readable: absent usage must still produce a cache observation. */
function observeCacheSafe(usage, previousUsage) {
	const cache = observeCache(usage, previousUsage);
	return { cache: cache.reuse !== void 0 || cache.billedInputTokens !== void 0 ? cache : { drop: false } };
}
/**
* The `contextLens` projection unit. The fold is fully synchronous and pure;
* uninteresting events return the same state reference (the registry's
* zero-work `Object.is` gate).
*/
const contextLensProjectionDefinition = {
	key: "contextLens",
	schema: projectionSchema,
	init: () => ({
		pending: null,
		last: null,
		requests: [],
		totalRequests: 0,
		cacheDrops: 0,
		structuralChanges: 0,
		lastDropOrdinal: 0,
		epoch: null,
		surfaceCarry: 0
	}),
	apply: (state, event) => {
		switch (event.type) {
			case "request/header": {
				const epoch = fingerprintHeader(event.data.header);
				return state.pending === null ? {
					...state,
					epoch
				} : {
					...state,
					epoch,
					pending: {
						...state.pending,
						header: epoch
					}
				};
			}
			case "request/context": {
				const { provider, model, contextWindow } = event.data;
				const epochContext = {
					provider,
					model,
					...contextWindow === void 0 ? {} : { contextWindow }
				};
				return {
					...state,
					epochContext,
					...state.pending === null ? {} : { pending: {
						...state.pending,
						...contextWindow === void 0 ? {} : { contextWindow }
					} }
				};
			}
			case "step/start": {
				const base = state.pending === null ? state : finalize(state, state.pending);
				return {
					...base,
					pending: {
						turn: event.data.turn,
						step: event.data.step,
						seq: event.seq,
						time: event.time,
						header: base.epoch,
						...base.epochContext?.contextWindow === void 0 ? {} : { contextWindow: base.epochContext.contextWindow },
						sawMessage: false,
						stepEnded: false,
						surfaceAtStart: base.surfaceCarry,
						surfaceTokens: 0
					}
				};
			}
			case "step/end": {
				if (state.pending === null) return state;
				const pending = state.pending;
				if (pending.turn !== event.data.turn || pending.step !== event.data.step) return state;
				return {
					...state,
					pending: {
						...pending,
						stepEnded: true
					}
				};
			}
			case "user/message": {
				if (state.pending === null) return {
					...state,
					surfaceCarry: state.surfaceCarry + estimateBlocksTokens(event.data.content) + ROLE_OVERHEAD
				};
				const delta = estimateBlocksTokens(event.data.content) + ROLE_OVERHEAD;
				return {
					...state,
					pending: {
						...state.pending,
						surfaceTokens: state.pending.surfaceTokens + delta
					},
					surfaceCarry: state.surfaceCarry + delta
				};
			}
			case "assistant/chunk":
				if (event.data.chunk.type !== "usage" || state.pending === null) return state;
				return {
					...state,
					pending: {
						...state.pending,
						usage: usageFrom(event.data.chunk.usage)
					}
				};
			case "assistant/message": {
				if (state.pending === null) return {
					...state,
					surfaceCarry: state.surfaceCarry + estimateBlocksTokens(event.data.message.content) + ROLE_OVERHEAD
				};
				const pending = {
					...state.pending,
					sawMessage: true,
					...event.data.usage === void 0 ? {} : { usage: usageFrom(event.data.usage) }
				};
				return {
					...state,
					pending,
					surfaceCarry: state.surfaceCarry + estimateBlocksTokens(event.data.message.content) + ROLE_OVERHEAD
				};
			}
			case "tool/result": {
				const delta = estimateBlocksTokens(event.data.message.content) + ROLE_OVERHEAD;
				if (state.pending === null) return {
					...state,
					surfaceCarry: state.surfaceCarry + delta
				};
				return {
					...state,
					pending: {
						...state.pending,
						surfaceTokens: state.pending.surfaceTokens + delta
					},
					surfaceCarry: state.surfaceCarry + delta
				};
			}
			case "turn/end": {
				if (state.pending === null) return state;
				const turnEnd = turnEndKindOf(event) ?? "other";
				return finalize(state, {
					...state.pending,
					turnEnd
				});
			}
			default: return state;
		}
	},
	view: (state) => ({
		...state.last === null ? {} : { latest: state.last },
		recentRequests: state.requests,
		summary: {
			totalRequests: state.totalRequests,
			cacheDrops: state.cacheDrops,
			structuralChanges: state.structuralChanges,
			lastDropOrdinal: state.lastDropOrdinal
		}
	}),
	stateVersion: 2
};
//#endregion
//#region src/index.ts
const name = "context-lens";
/** The plugin needs no services up front; the projection registry is an optional child. */
const inject = [];
/**
* Empty config with a default: a loader row mounting this plugin with no
* `config` key passes `undefined` through fiber config resolution, and a
* bare `z.object({})` rejects undefined with "Required" — every profile
* patch that inserts the row without config would fail to boot.
*/
const Config = z.object({}).default({});
/**
* Install the observer: register the `contextLens` projection unit when the
* session-projection registry is present (it ships in the base profile). The
* registration is an effect on this fiber, so unloading the plugin removes
* the key from snapshots and client reads become capability absence.
* @param ctx - the plugin context.
*/
function apply(ctx) {
	ctx.inject(["sessionProjections"], (projectionCtx) => {
		projectionCtx.sessionProjections.register(contextLensProjectionDefinition);
	});
}
//#endregion
export { Config, apply, inject, name };
