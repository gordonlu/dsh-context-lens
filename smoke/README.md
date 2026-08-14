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

## Full GUI E2E (smoke/e2e.mts)

The real-browser end-to-end over a SECOND web instance with an isolated
DSH_HOME and a mock LLM route — no provider keys, no touching the running
GUI. Setup (all paths in the workspace so the browser script and the server
share state):

```sh
HARNESS=/data/code/deepseek-harness
HOME_E2E=/data/code/dsh-context-lens/.e2e-home   # gitignored

# 1. mock LLM (OpenAI-compatible) on :8900
cd "$HARNESS" && node --import tsx packages/test-support/llm-mock-server/src/bin.ts \
  --port 8900 --api-key mock-key --sequence success --repeat-last \
  --success-text "E2E mock reply from llm-mock-server" &

# 2. second web instance on :3081, plugin mounted
rm -rf "$HOME_E2E"
DSH_HOME="$HOME_E2E" DSH_TELEMETRY_DISABLED=1 \
DEEPSEEK_BASE_URL=http://127.0.0.1:8900/v1 DEEPSEEK_API_KEY=mock-key \
  node --import tsx/esm "$HARNESS/apps/cli/src/bin.ts" --profile web --port 3081 &

# 3. mount the plugin (after first boot healed the profile fallback):
ln -sfn /data/code/dsh-context-lens "$HOME_E2E/profiles/node_modules/dsh-context-lens"
cat > "$HOME_E2E/profiles/web/cordis.patch.yml" <<'YAML'
- insert:
    - id: context-lens
      name: dsh-context-lens
YAML
# …then restart the web instance.

# 4. run the E2E
"$HARNESS/node_modules/.bin/tsx" smoke/e2e.mts
```

The E2E asserts: bundle serving + loader ABI, boot manifest entry, plugin CSS
injection, the 请求上下文 / Request Context tab in the conversation.view
slot, overview strip counters, per-record list + inspector (usage buckets,
unavailable semantics), a second real turn producing a second record, and the
zh ↔ en language round-trip. Uses the checkout's playwright with the
installed ms-playwright chromium (`E2E_CHROMIUM` overrides).

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
4. **Config-less profile rows failed to boot** — `Config = z.object({})`
   rejects `undefined` with "Required", so a profile patch inserting the row
   without a `config` key failed the whole plugin tree. Now
   `z.object({}).default({})`; the server smoke asserts it.

## Coverage notes

The mock LLM reports a fixed `prompt_tokens: 3`, so the reuse ratio is
constant and the drop banner cannot trigger in the E2E — the drop alarm,
`likelyCauses` ranking, and `step/end` lifecycle are covered by
server-smoke instead. Slot RENDERING of the diff details and the drop banner
UI paths still await a session with real cache-usage variance.
