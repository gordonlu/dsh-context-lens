# Implementation Notes

Engineering notes for dsh-context-lens v0.1. The READMEs carry the product story; this file carries the decisions, invariants, and the npm-ecosystem workaround.

## Design principles (in force)

1. **Committed request context is the only compared state.** The harness's mutable in-memory state (assemblers, adapters, providers) is never read. The comparison inputs are the `request/header` epoch log (`request/header` is appended only on change, so the snapshot in force at `step/start` is exactly what the harness had committed at that point) plus `request/context` (provider/model/context window) and the provider-reported usage buckets. If a header event lands inside a step before dispatch, that header replaces the epoch snapshot for that request — it is the header the provider actually saw.
2. **Canonicalization is model-observable.** Fingerprints canonicalize object key order (sorted), preserve array order (meaningful), and treat primitives verbatim. Two headers that differ only in key order hash identically; two headers that declare the same tools in a different order do not.
3. **Tool order is a first-class committed change.** `RequestDiff.tools.orderChanged` is true when the tool set and every schema are identical but the declaration array order differs. Order is model-observable (the provider sees the serialized array), so it is a legitimate candidate cause for a cache drop.
4. **The observability boundary is explicit** (see README table). Below the "cannot determine" line nothing is computed, displayed, or hinted.
5. **Replay consistency is a formal invariant.** `apply` is pure and synchronous; folding a log incrementally and replaying it from `init` must produce identical state and projection. Pinned by the replay-consistency suite, including chunked folding.
6. **No new durable session events.** The projection is a pure observer; the companion `context-lens-invariant` plugin is a no-op installer (it exists so the package name is reserved under the harness's invariants service; no runtime invariant is registered because the contracts live inside the pure fold and are proven by tests).

## Request lifecycle (one record per step)

- The real agent loop emits `step/start` … `step/end` (always — even on error/abort, `step/end` lands in a `finally`) … `turn/end` once per turn. The fold mirrors that shape: `step/start` opens a pending record; `step/end` marks the span closed (`stepEnded`); `turn/end` finalizes the last pending with the turn's end reason; intermediate steps finalize at the next `step/start` carrying the `step/end` marker. A crash-orphaned pending (no `step/end`, no `turn/end`) closes as **failed** at the next `step/start`.
- Status matrix: message present **and** (turn ended **or** `step/end` closed the step) → `completed`; no message and `aborted` → `aborted`; no message and `error` → `failed`; message but neither marker (crash orphan) → `failed`.
- Retries re-emit `request/header` inside the step; the pending record is updated, never duplicated. The final `assistant/message` usage replaces any earlier `assistant/chunk` usage sample.
- Usage arrives only via `assistant/message` (explicit `usage` field) or an `assistant/chunk` of type `usage`. Anything else stays absent — `unavailable`, never `0`.
- The retained window keeps the newest 100 records (`MAX_RETAINED_REQUESTS`); counters (`totalRequests`, `cacheDrops`, `structuralChanges`) are cumulative and survive trimming.

## Cache math (src/cache.ts)

- `billed = inputTokens + (cacheRead ?? 0) + (cacheWrite ?? 0)`; missing fields never become zero *inside* the buckets, but reads are required: `reuse = cacheRead / billed`, `undefined` when reads are absent or billed is 0.
- Drop detection: both requests report reuse, previous billed input ≥ 1000 (`CACHE_ALARM_MIN_BILLED_INPUT`), and `deltaPoints ≤ -20` (`CACHE_DROP_POINTS_THRESHOLD`). A drop is an observation, not a diagnosis.
- Surface alarm thresholds: ≥ 1000 tokens (`SURFACE_GROWTH_ALARM_TOKENS`) or ≥ 20% of the previous billed input (`SURFACE_GROWTH_ALARM_FRACTION`).
- Surface estimate: `ceil(chars / 4)` per text block + per-block overhead + 4-token role framing per message; `tool-result` blocks price their inner blocks plus one block overhead.

## Diff semantics (src/diff.ts)

- Tools are classified by name (`added`/`removed`/`modified` via schema hash), sorted; `orderChanged` requires an identical set with identical schemas and a differing declaration order.
- `likelyCauses` is populated **only on a drop**, in fixed rule priority: model/provider → system → tools → config → surface growth → fallback. The view renders it with a "correlation, not causation" disclaimer.
- The diff is computed once at finalization and stored on the record; it is never recomputed at render time.

## npm snapshot gaps (why vendor-stubs exists)

The published `@deepseek-ai/*` registry snapshot is inconsistent:

- `@deepseek-ai/dsh-compact` (a dependency of `@deepseek-ai/dsh-client-runtime`, a peer of `dsh-client-ui-conversation`) and `@deepseek-ai/dsh-type-meta` (a peer of `dsh-client-runtime` and `dsh-session`) **do not exist on any registry** (npmjs and npmmirror both 404).
- pnpm ≥ 10/11 auto-installs peer dependencies regardless of `auto-install-peers=false` (verified in a scratch project), and `pnpm.overrides` with `file:`/`link:` targets is ineffective when the target package cannot be resolved from the registry at all (verified in a second scratch project).

The workaround: **type-only vendored snapshots**. Each of the eight dev-time packages (`dsh-session`, `dsh-llm`, `dsh-session-projection`, `dsh-invariants`, `dsh-brand`, `dsh-client-locale`, `dsh-client-ui-slots`, `dsh-client-ui-conversation`, `dsh-client-runtime`) is vendored under `vendor-stubs/<name>/`:

- `lib/types/` copied verbatim from the published tarball (source of type truth, pinning `0.0.1-rc.1`; `dsh-invariants` pins `0.1.0-rc.6`).
- `package.json` sanitized: **no** `dependencies`/`peerDependencies` (so pnpm never auto-installs the missing packages), exports map reduced to `types` conditions.
- `dsh-llm` additionally ships a 3-line `runtime.js` (`MessageId`/`CallId`/`ProviderRequestId` identity constructors) because tests import the brand functions as values.
- `skipLibCheck` suppresses unresolved imports inside the vendored `.d.ts` (verified in a scratch project on TypeScript 6.0.3). The type surface consumed (session event map, `EpochHeader`, `TokenUsage`, slot registration, `PropsLocale`, runtime props merge) was verified against the unpacked tarballs before writing the client code.

`@deepseek-ai/cordis@4.0.1` installs for real (its chain — cosmokit 1.8.2, cordis-plugin-loader 1.0.2, cordis-plugin-include 1.0.6 — is fully published). If the harness ever publishes the missing packages, the `file:` devDeps can be swapped back to registry ranges and `vendor-stubs/` deleted.

Note: registry `dsh-session-projection` declares `zod@^4.4.3` while this project pins `zod@^3.23.8`; under `skipLibCheck` the mixed tree typechecks (verified), and the vendored stub has no zod dependency of its own.

## Bundle ABI (tsdown.config.ts)

- Node entries `lib/index.js` + `lib/invariant.js` (ESM, `.js` forced — the package declares `"type": "module"`).
- Browser entry `lib/client.js`: CommonJS closure-factory artifact matching the harness loader contract — `window.__ModuleLoader__.load({ id: "dsh-context-lens", factory: (require) => { … return module.exports } })` with `var module = { exports: {} }` intro.
- Externals = the loader's module-table entries. The keys MUST be the shell's frozen `PLATFORM_MODULES` (`@deepseek-ai/dsh-client-web/src/platform.ts`) plus the runtime registration — every dsh-* key is `@deepseek-ai`-scoped there; the `CLIENT_EXTERNALS` list is asserted against the shell source by `smoke/client-smoke.mts`. Everything else inlines (`deps.neverBundle` / `deps.alwaysBundle`).
- CSS Modules go through a virtual-id plugin (`\0dsh-css:` + `.mjs`, so tsdown's `.css` guard never sees them), compiled by lightningcss (`[hash]_[local]`, minified), and emitted as one idempotent `<style data-plugin="dsh-context-lens" data-plugin-css="…">` tag per module file. `addWatchFile` keeps the physical stylesheet in the watch graph.

## Test suite (53 tests)

- `fingerprint.spec.ts` — canonicalization (key order, array order, verbatim primitives), hash stability, schema estimation.
- `cache.spec.ts` — billed/reuse math, absent-fields-are-absent, drop thresholds, surface alarms, exported constants.
- `diff.spec.ts` — unchanged/change detection, add/remove/modify, `orderChanged`, schema-key-order non-issue, cache boundary, cause ranking + fallback.
- `projection.spec.ts` — lifecycle (epoch carry, mid-step header replacement, retry-in-step, abort/error statuses, crash orphans, usage absence, retention + cumulative counters), surface estimates, replay consistency (live ≡ replay ≡ chunked, with a 27-event scenario log covering multi-step turns, retry, abort, missing/late usage, tool reorder, schema change, model/config change), determinism.
