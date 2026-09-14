# Implementation Notes

Engineering notes for dsh-context-lens v0.2. The READMEs carry the product story; this file carries the decisions, invariants, and the npm-ecosystem workaround.

## Design principles (in force)

1. **Committed request context is the only compared state.** The harness's mutable in-memory state (assemblers, adapters, providers) is never read. The comparison inputs are the `request/header` epoch log (`request/header` is appended only on change, so the snapshot in force at `step/start` is exactly what the harness had committed at that point) plus `request/context` (provider/model/context window) and the provider-reported usage buckets. If a header event lands inside a step before dispatch, that header replaces the epoch snapshot for that request — it is the header the provider actually saw.
2. **The plugin row must boot without config.** The loader passes `undefined` config for a row with no `config` key, so `Config` is `z.object({}).default({})` — a bare `z.object({})` rejects undefined with "Required" and the whole plugin tree fails to load (found by the GUI E2E).
3. **Canonicalization is model-observable.** Fingerprints canonicalize object key order (sorted), preserve array order (meaningful), and treat primitives verbatim. Two headers that differ only in key order hash identically; two headers that declare the same tools in a different order do not.
4. **Tool order is a first-class committed change.** `RequestDiff.tools.orderChanged` is true when the tool set and every schema are identical but the declaration array order differs. Order is model-observable (the provider sees the serialized array), so it is a legitimate candidate cause for a cache drop.
5. **The observability boundary is explicit** (see README table). Below the "cannot determine" line nothing is computed, displayed, or hinted.
6. **Replay consistency is a formal invariant.** `apply` is pure and synchronous; folding a log incrementally and replaying it from `init` must produce identical state and projection. Pinned by the replay-consistency suite, including chunked folding.
7. **No new durable session events.** The projection is a pure observer; the companion `context-lens-invariant` plugin is a no-op installer (it exists so the package name is reserved under the harness's invariants service; no runtime invariant is registered because the contracts live inside the pure fold and are proven by tests).

## Request lifecycle (one record per step)

- The real agent loop emits `step/start` … `step/end` (always — even on error/abort, `step/end` lands in a `finally`) … `turn/end` once per turn. The fold mirrors that shape: `step/start` opens a pending record; `step/end` marks the span closed (`stepEnded`); `turn/end` finalizes the last pending with the turn's end reason; intermediate steps finalize at the next `step/start` carrying the `step/end` marker. A crash-orphaned pending (no `step/end`, no `turn/end`) closes as **failed** at the next `step/start`.
- Status matrix: message present **and** (turn ended **or** `step/end` closed the step) → `completed`; no message and `aborted` → `aborted`; no message and `error` → `failed`; message but neither marker (crash orphan) → `failed`.
- Retries stay inside the same step and never mint a new record. Verified against current mainline: the agent loop re-dispatches on `agent/request-error` inside a `while (true)` with the SAME turn/step, so retry chunks and the final message carry identical `{turn, step}`. The llm-retry README describes a fresh-turn shape; the fold supports both — a fresh-turn retry splits records naturally at the new `step/start` (defensive test `splits records when a retry opens a fresh turn`). The final `assistant/message` usage replaces any earlier `assistant/chunk` usage sample.
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

## Harness packages come from the registry

Until 0.1.5 the published `@deepseek-ai/*` snapshot was unusable: `dsh-compact`
and `dsh-type-meta` were referenced by the client packages but never published,
and pnpm ≥ 10/11 auto-installs peers. The workaround was nine **type-only
vendored snapshots** under `vendor-stubs/`.

**0.1.5-rc.2 publishes the whole set**, so `vendor-stubs/` is gone: the nine
packages are ordinary devDependencies pinned to their published versions
(`dsh-client-runtime` at `0.1.1-rc.2`, the rest at `0.1.5-rc.2`). Two settings
keep the type surface usable:

- `autoInstallPeers: true` (`pnpm-workspace.yaml`) — the client packages' peers
  (`dsh-client-store`, `dsh-typert-protocol`, `dsh-api-remotes`, `dsh-scope`, …)
  must resolve, or `skipLibCheck` silently degrades their declarations.
- `zod@^4.4.3` — the projection contract is typed against zod 4
  (`ZodType<T, ZodTypeDef, T>` vs zod 4's `$ZodTypeInternals`); zod 3 does not
  satisfy `ProjectionDefinition.stateSchema`.

**Why this mattered.** An unresolved import inside a vendored `.d.ts` does not
fail the build — `skipLibCheck` swallows it and the declaration silently
degrades. The harness's `SessionStandardProps` merge (which types
`useSession`/`useProjection` for every session-scoped slot) lives in
`dsh-client-runtime`'s client entry beside imports of a dozen packages the
stubs did not carry, so `useSession` typechecked as `any`. The same silent
degradation hid the 0.1.5 projection-contract break until the runtime failed.

## 0.1.5 harness contract (breaking, migrated in 0.3.0)

The 0.1.5 harness moved three things this plugin depends on. All three are
migrated; nothing here is optional for a 0.1.5 host:

1. **Projection units split host state from the client view.** A
   `ProjectionDefinition` now declares `stateSchema` (validates the persisted
   host state) and an optional `wire: { viewSchema, view }` (the client-facing
   payload). `snapshot()` only emits units that declare `wire`; a unit with
   only the old `schema`/`view` fields registers successfully but serves
   nothing, which is exactly how the client went blank. `SessionProjectionMap`
   (client values) and `SessionProjectionStateMap` (host state) are separate
   merge-extensible tables and both must be augmented.
2. **The system prompt left the request header.** `EpochHeader` is now
   `{ config, adapterDefaults?, tools? }`; the model-visible prompt is a
   `system/message` history node (the loop appends one per series and a later
   node clears the earlier ones, so the newest node is the whole prompt). The
   fold tracks it in `state.system` and merges the fingerprint into each
   record's header at finalization, so `HeaderFingerprint` keeps its shape and
   the diff is unchanged. `stateVersion` is 3 (persisted rows from the old
   shape are discarded).
3. **`assistant/chunk` is gone.** Usage rides `assistant/message`
   (`{ turn, step, message, stream, usage?, interrupted? }`); a cancelled turn
   finalizes its delivered prefix as an `interrupted` message, so "no message"
   no longer identifies an abort — the turn's end reason does.

Client side: the browser packages now ship as `window.__ModuleLoader__` handoff
bundles (their `./client` entry is not an ES module), and the shell's platform
table changed — `dsh-client-store` and `dsh-client-ui-dockkit` replaced
`dsh-client-web-react`, `dsh-client-ui-attachment` and
`dsh-client-schema-form`. `CLIENT_EXTERNALS` must equal the shell's
`PLATFORM_MODULES` plus `dsh-client-runtime/client`; `smoke/client-smoke.mts`
asserts exactly that against the shell source.

## Bundle ABI (tsdown.config.ts)

- Node entries `lib/index.js` + `lib/invariant.js` (ESM, `.js` forced — the package declares `"type": "module"`).
- Browser entry `lib/client.js`: CommonJS closure-factory artifact matching the harness loader contract — `window.__ModuleLoader__.load({ id: "dsh-context-lens", factory: (require) => { … return module.exports } })` with `var module = { exports: {} }` intro.
- Externals = the loader's module-table entries. The keys MUST be the shell's frozen `PLATFORM_MODULES` (`@deepseek-ai/dsh-client-web/src/platform.ts`) plus the runtime registration — every dsh-* key is `@deepseek-ai`-scoped there; the `CLIENT_EXTERNALS` list is asserted against the shell source by `smoke/client-smoke.mts`. Everything else inlines (`deps.neverBundle` / `deps.alwaysBundle`).
- CSS Modules go through a virtual-id plugin (`\0dsh-css:` + `.mjs`, so tsdown's `.css` guard never sees them), compiled by lightningcss (`[hash]_[local]`, minified), and emitted as one idempotent `<style data-plugin="dsh-context-lens" data-plugin-css="…">` tag per module file. `addWatchFile` keeps the physical stylesheet in the watch graph.

## Test suite (64 tests)

- `fingerprint.spec.ts` — canonicalization (key order, array order, verbatim primitives), hash stability, schema estimation.
- `cache.spec.ts` — billed/reuse math, absent-fields-are-absent, drop thresholds, surface alarms, exported constants.
- `diff.spec.ts` — unchanged/change detection, add/remove/modify, `orderChanged`, schema-key-order non-issue, cache boundary, cause ranking + fallback.
- `projection.spec.ts` — lifecycle (epoch carry, mid-step header replacement, retry-in-step, abort/error statuses, crash orphans, usage absence, retention + cumulative counters), surface estimates, replay consistency (live ≡ replay ≡ chunked, with a 27-event scenario log covering multi-step turns, retry, abort, missing/late usage, tool reorder, schema change, model/config change), determinism.

## Versioning policy (in force)

- **Prefer patch increments.** Routine fixes, UI refinements, and small
  features bump the patch digit (`0.2.1`, `0.2.2`, …) — `pnpm version patch`
  and `npm publish` is the whole flow; the `prepublishOnly` gate runs
  typecheck + tests + build automatically.
- **Minor increments are reserved** for breaking changes or substantial new
  surface (the 0.1.0 → 0.2.0 jump covered the change-first UI redesign and
  the publish-readiness cleanup; nothing since then justifies another).
- The npm version and the `vX.Y.Z` git tag must stay in sync on every
  release.
