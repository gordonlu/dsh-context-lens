# Real-runtime smoke

These scripts close the handover's §5 gap: every ABI conclusion that used to
come from unpacked npm tarballs and code review is now exercised against the
REAL harness packages from a local checkout (not the vendored type stubs).

They need a harness checkout on this machine (the same one the GUI runs
from), because:

- the real packages are TS sources resolved through the checkout's tsconfig
  `paths` (`tsx --tsconfig`),
- the harness's own `node_modules` supplies `jsdom` and the built client
  packages.

```sh
HARNESS=/data/code/deepseek-harness   # or wherever the checkout lives
TSX="$HARNESS/node_modules/.bin/tsx"

# Server half: real Cordis + real session/llm/tools/agent-loop/session-projection
# packages, the built lib/index.js mounted like a profile row, six scripted
# turns (multi-step, tool-call, system + tool changes, abort) driven through
# the REAL AgentLoop. 54 assertions; JSON dump in smoke/out/projection.json.
"$TSX" --tsconfig "$HARNESS/tsconfig.json" smoke/server-smoke.mts

# Browser half: lib/client.js loaded exactly like the real loader does,
# externals resolved against the shell's real PLATFORM_MODULES table
# (conformance-asserted), then mounted into a REAL SlotRegistry + the real
# locale plugin. 12 assertions.
DSH_SMOKE_HARNESS="$HARNESS" \
  "$TSX" --tsconfig "$HARNESS/tsconfig.json" smoke/client-smoke.mts
```

Both exit non-zero on the first failing run's assertion count. `css-hook.mjs`
is a node loader hook that lets plain node import real client packages whose
sources carry `*.module.css` (their build pipeline inlines CSS; node cannot).

## What the smoke found (v0.1 → fixed)

1. **`orderChanged` schema gap** — the strict `toolsDiffSchema` did not
   declare the emitted `orderChanged` field, so the real registry's
   `snapshot()` (which schema-validates every read) threw and the projection
   was unreadable in the live runtime. Unit tests had only asserted `view()`
   output. Fixed + regression test that parses the view with the schema.
2. **`step/end` was not folded** — intermediate steps of multi-step turns
   were mislabeled `failed` (the real loop emits `step/end` between steps;
   the synthetic unit log never did). The fold now marks `stepEnded` and the
   status matrix treats a `step/end`-closed step with a message as
   `completed`.
3. **Client externals used unscoped keys** — `CLIENT_EXTERNALS` had
   `dsh-client-ui-slots` etc. while the shell's frozen module table keys are
   `@deepseek-ai/`-scoped; the bundle would have missed the loader table in
   the real browser. Scoped now, and the smoke asserts the list against
   `PLATFORM_MODULES` read from the shell source.

## Not covered (still needs a full GUI session)

Slot RENDERING in the real web app (the view components run against a live
conversation + projection seat), locale switching UI, and the
`/plugins/dsh-context-lens/client.js` serving path through a booted web
profile. That requires a second `dsh web` instance on another port with this
package added as a profile bundle (`dsh plugin --profile <name> add .`).
