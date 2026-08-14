/**
 * server-smoke.mts — real-runtime smoke for the dsh-context-lens server half.
 *
 * Closes the handover gap: every ABI conclusion so far came from unpacked npm
 * tarballs and code review. This script boots the REAL DeepSeek Harness
 * packages from a checkout (not the vendored type stubs), mounts the built
 * `lib/index.js`, drives REAL agent-loop turns through a scripted adapter
 * (multi-step turn, tool set change, system-prompt change, aborted turn,
 * cache-read usage buckets), and asserts the `contextLens` projection output
 * that the real session-projection registry served (schema-validated on
 * read).
 *
 * Run from anywhere with the harness checkout's tsx, so tsconfig `paths`
 * resolve the real workspace packages:
 *
 *   HARNESS=/data/code/deepseek-harness   # or wherever the checkout lives
 *   "$HARNESS/node_modules/.bin/tsx" \
 *     --tsconfig "$HARNESS/tsconfig.json" \
 *     smoke/server-smoke.mts
 *
 * Exits 0 only when every assertion passes; a JSON dump of the projection is
 * written to smoke/out/projection.json.
 *
 * @module dsh-context-lens/smoke
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, {
  CallId,
  LlmAdapter,
  createUserMessage,
  type GenerateOptions,
  type LlmResolvedModelInfo,
  type StreamChunk,
  type TokenUsage,
} from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { ContextLensProjection, RequestRecord } from '../src/types.ts'
// The built server half under test — exactly what a profile would load.
import * as lens from '../lib/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, 'out')

/* ------------------------------------------------------------------ *
 * Scripted adapter: each real model call consumes the next script     *
 * entry, mirroring the harness's own MockAdapter but with             *
 * per-request cache-usage control.                                    *
 * ------------------------------------------------------------------ */

type ScriptEntry = ((options: GenerateOptions) => StreamChunk[]) | 'hang'

class ScriptedAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []

  constructor(private readonly script: ScriptEntry[]) {
    super()
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({
      provider,
      id: model,
      name: model,
      // Advertise a context window so `request/context` carries it.
      context: { contextWindow: 16384 },
    })
  }

  async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const entry = this.script.shift()
    if (entry === undefined) throw new Error('ScriptedAdapter: script exhausted')
    if (entry === 'hang') {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'partial' }
      await new Promise<void>((_resolve, reject) => {
        if (options.signal?.aborted) { reject(new Error('aborted')); return }
        options.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      })
      return
    }
    for (const chunk of entry(options)) {
      if (options.signal?.aborted) throw new Error('aborted')
      yield chunk
    }
  }
}

function textResponse(text: string, usage: TokenUsage): StreamChunk[] {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    ...Array.from(text, (char): StreamChunk => ({ type: 'text-delta', index: 0, text: char })),
    { type: 'block-end', index: 0, block: { type: 'text', text } },
    { type: 'usage', usage },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

function toolCallResponse(callId: string, name: string, args: object, usage: TokenUsage): StreamChunk[] {
  const id = CallId(callId)
  const argumentsJson = JSON.stringify(args)
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    { type: 'tool-call-delta', index: 0, id, name, argumentsDelta: argumentsJson },
    { type: 'block-end', index: 0, block: { type: 'tool-call', id, name, arguments: argumentsJson } },
    { type: 'usage', usage },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]
}

/* ------------------------------------------------------------------ *
 * Check plumbing.                                                     *
 * ------------------------------------------------------------------ */

let failures = 0
function check(label: string, condition: boolean, detail?: unknown): void {
  const mark = condition ? 'PASS' : 'FAIL'
  if (!condition) failures += 1
  console.log(`  [${mark}] ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
}

function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') {
        dispose()
        resolve()
      }
    })
  })
}

function send(agent: Agent, text: string): void {
  agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }))
}

async function drive(ctx: Context, agent: Agent, text: string): Promise<void> {
  send(agent, text)
  await waitForIdle(ctx, agent)
}

/* ------------------------------------------------------------------ *
 * The scenario.                                                       *
 * ------------------------------------------------------------------ */

const echo = defineContentToolFixture({
  name: 'echo',
  description: 'Echo a value back',
  parameters: { text: { type: 'string', required: true } },
  async execute(args: { text: string }): Promise<{ type: 'text'; text: string }[]> {
    return [{ type: 'text', text: `echo:${args.text}` }]
  },
})

// Usage buckets per request, in request order. Cache drops are engineered
// as high-reuse → near-zero-reuse transitions across the -20-point alarm
// threshold: D (after the system change) and E (after the tool registration),
// separated by a high-reuse recovery (F) so the second drop starts from a
// high baseline. E reports an explicit zero so the reuse ratio is a real 0
// (absent fields stay absent by design).
const USAGE: Record<string, TokenUsage> = {
  A: { inputTokens: 1800, outputTokens: 40, cacheReadTokens: 200, cacheWriteTokens: 0 }, // reuse 10%
  B1: { inputTokens: 150, outputTokens: 12, cacheReadTokens: 1850 }, // reuse 92.5%
  B2: { inputTokens: 200, outputTokens: 30, cacheReadTokens: 1800 }, // reuse 90%
  C: { inputTokens: 180, outputTokens: 22, cacheReadTokens: 1820 }, // reuse 91%
  D: { inputTokens: 2100, outputTokens: 25, cacheReadTokens: 50 }, // reuse 2.3% → DROP
  F: { inputTokens: 180, outputTokens: 22, cacheReadTokens: 2000 }, // reuse 91.7% (recovery)
  E: { inputTokens: 2300, outputTokens: 30, cacheReadTokens: 0 }, // reuse 0% → DROP
}

const adapter = new ScriptedAdapter([
  options => textResponse('hello from turn one', USAGE.A!),
  options => toolCallResponse('call-1', 'echo', { text: 'x' }, USAGE.B1!),
  options => textResponse('tool done', USAGE.B2!),
  options => textResponse('steady state', USAGE.C!),
  options => textResponse('system changed', USAGE.D!),
  options => textResponse('recovery steady', USAGE.F!),
  options => textResponse('two tools now', USAGE.E!),
  'hang',
])

async function main(): Promise<number> {
  console.log('=== dsh-context-lens server smoke (real harness packages) ===')

  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  ctx.llm.registerAdapter(['mock'], adapter)

  // The plugin under test: built server half, mounted like a profile row.
  await ctx.plugin({ name: lens.name, inject: lens.inject, apply: lens.apply } as never)
  // A profile row with no `config` key passes undefined through fiber config
  // resolution; the schema must default it (regression: bare z.object({})
  // rejected undefined with "Required" and the row failed to boot).
  check('Config schema defaults a config-less row', JSON.stringify(lens.Config.parse(undefined)) === '{}')
  check('plugin apply mounted the contextLens projection', ctx.sessionProjections !== undefined)
  const registered = (ctx.sessionProjections as unknown as {
    registrations?: Map<string, unknown>
  }).registrations
  check('contextLens key registered in the live registry', registered?.has('contextLens') ?? false)

  const echoDispose = ctx.tools.register(echo)
  const agent = ctx.agentLoop.create(SessionId('lens-smoke'), { provider: 'mock', model: 'mock' })

  // Turn 1 — baseline.
  await drive(ctx, agent, 'first turn')
  // Turn 2 — one tool call + follow-up step (two records in one turn).
  await drive(ctx, agent, 'call the echo tool')
  // Turn 3 — steady state, same committed header.
  await drive(ctx, agent, 'again, steady')
  // System-prompt change before turn 4 (drop cause: system-changed).
  const sectionDispose = ctx.systemPrompt.section({
    name: 'smoke:guidance',
    order: 50,
    text: 'Extra smoke-test guidance for the model.',
  })
  await drive(ctx, agent, 'system prompt changed now')
  // Turn 5 — recovery: same committed header, high reuse again.
  await drive(ctx, agent, 'recovery steady')
  // Tool set change before turn 6 (drop cause: tools-changed).
  const extra = defineContentToolFixture({
    name: 'extra',
    description: 'An additional tool',
    parameters: {},
    async execute(): Promise<{ type: 'text'; text: string }[]> {
      return [{ type: 'text', text: 'extra done' }]
    },
  })
  ctx.tools.register(extra)
  await drive(ctx, agent, 'now two tools are available')
  // Turn 7 — abort mid-stream (no assistant message, no usage).
  send(agent, 'hang then cancel')
  await new Promise(resolve => setTimeout(resolve, 50))
  agent.cancel({ kind: 'user' })
  await waitForIdle(ctx, agent)

  console.log('\n--- committed header events (shape check vs vendor types) ---')
  const headerEvents = agent.session.events.filter(e => e.type === 'request/header')
  for (const event of headerEvents.slice(0, 3)) {
    const header = (event as { data: { header: unknown; reason: string } }).data
    console.log(`  reason=${header.reason} config=${JSON.stringify((header.header as { config: unknown }).config)}`)
    console.log(`    system=${JSON.stringify((header.header as { system?: string }).system)}`)
    console.log(`    tools=${JSON.stringify((header.header as { tools?: { name: string }[] }).tools?.map(t => t.name))}`)
  }

  console.log('\n--- projection read (schema-validated by the registry) ---')
  const snapshot = ctx.sessionProjections.snapshot(agent.session)
  const view = snapshot.values['contextLens'] as ContextLensProjection
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'projection.json'), JSON.stringify(view, null, 2))

  const records: RequestRecord[] = view.recentRequests
  const summary = view.summary

  console.log('\n--- summary ---')
  check('totalRequests === 8 (seven turns, one two-step turn, one aborted)', summary.totalRequests === 8, summary)
  check('cacheDrops === 2 (system change drop + tool set change drop)', summary.cacheDrops === 2, summary)
  check('structuralChanges === 2 (system change + tool set change)', summary.structuralChanges === 2, summary)
  check('retained window holds every record', records.length === 8, records.length)
  check('latest is the aborted turn-7 step', view.latest?.status === 'aborted', view.latest?.status)

  console.log('\n--- per-record shape ---')
  const ids = records.map(r => `${r.turn}:${r.step}`)
  check('record ids are turn:step', ids.join(',') === '1:1,2:1,2:2,3:1,4:1,5:1,6:1,7:1', ids)
  for (const record of records) {
    const ok = Number.isInteger(record.turn) && record.turn > 0
      && Number.isInteger(record.step) && record.step > 0
      && Number.isInteger(record.seq) && record.seq >= 0
      && Number.isFinite(record.time)
      && ['completed', 'failed', 'aborted'].includes(record.status)
      && record.header !== undefined
    check(`record ${record.id} basic shape`, ok === true)
  }
  check('seq strictly increases across records', records.every((r, i) => i === 0 || r.seq > (records[i - 1]?.seq ?? -1)))

  console.log('\n--- provider/model/context ---')
  check('records carry provider mock', records.every(r => r.provider === 'mock'), records.map(r => r.provider))
  check('records carry model mock', records.every(r => r.model === 'mock'), records.map(r => r.model))
  check('request/context window carried into records', records[0]?.contextWindow === 16384, records[0]?.contextWindow)

  console.log('\n--- header fingerprints ---')
  const r0 = records[0]!
  check('configHash non-empty on first record', r0.header.configHash.length > 0)
  check('systemHash present (harness identity renders a system prompt)', r0.header.systemHash !== undefined && r0.header.systemHash.length > 0)
  check('systemBytes present', r0.header.systemBytes !== undefined && r0.header.systemBytes > 0)
  check('one tool fingerprinted at start (echo)', r0.header.toolCount === 1 && r0.header.tools.length === 1, r0.header.tools.map(t => t.name))
  check('tool fingerprint has schema hash + estimate', r0.header.tools[0]!.schemaHash.length > 0 && r0.header.tools[0]!.estimatedTokens > 0)
  check('tool set change visible in header (extra added)', records[6]!.header.toolCount === 2 && records[6]!.header.tools.map(t => t.name).includes('extra'), records[6]!.header.tools.map(t => t.name))
  check('system change visible in header hash', records[4]!.header.systemHash !== undefined && records[4]!.header.systemHash !== r0.header.systemHash)

  console.log('\n--- usage + cache math ---')
  check('turn-1 usage recorded verbatim (input 1800 / cacheRead 200)', r0.usage?.inputTokens === 1800 && r0.usage.cacheReadTokens === 200, r0.usage)
  check('turn-1 billed = 2000', r0.cache?.billedInputTokens === 2000, r0.cache?.billedInputTokens)
  check('turn-1 reuse ≈ 0.10', r0.cache?.reuse !== undefined && Math.abs(r0.cache.reuse - 0.1) < 1e-9, r0.cache?.reuse)
  const r1 = records[1]!
  const r2 = records[2]!
  const r3 = records[3]! // 3:1 steady state
  const r4 = records[4]! // 4:1 system change
  const r5 = records[5]! // 5:1 recovery
  const r6 = records[6]! // 6:1 tool set change
  const r7 = records[7]! // 7:1 aborted
  check('two-step turn produced two records with distinct usage', r1.usage?.cacheReadTokens === 1850 && r2.usage?.cacheReadTokens === 1800, [r1.usage, r2.usage])
  check('multi-step turn: intermediate step is completed, not failed', r1.status === 'completed' && r1.turn === r2.turn, { r1: r1.status, r2: r2.status })
  check('steady state reuse ≈ 0.91, no drop', Math.abs((r3.cache?.reuse ?? 0) - 0.91) < 1e-9 && r3.cache?.drop === false, r3.cache)
  check('system-change request dropped (reuse 2.3%)', r4.cache?.drop === true && r4.cache.reuse !== undefined && r4.cache.reuse < 0.05, r4.cache)
  check('recovery request high reuse, no drop', r5.cache?.reuse !== undefined && r5.cache.reuse > 0.9 && r5.cache.drop === false, r5.cache)
  check('tool-change request dropped (reuse 0%)', r6.cache?.drop === true && r6.cache.reuse === 0, r6.cache)
  check('aborted turn has no usage and no drop payload', r7.usage === undefined && JSON.stringify(r7.cache) === '{"drop":false}', r7.usage ?? r7.cache)

  console.log('\n--- diffs vs previous ---')
  check('first record has no diffFromPrevious', r0.diffFromPrevious === undefined)
  check('system-change record diffs system changed', r4.diffFromPrevious?.system.changed === true, r4.diffFromPrevious?.system)
  check('system-change drop ranks system-changed first', r4.diffFromPrevious?.likelyCauses?.[0] === 'system-changed', r4.diffFromPrevious?.likelyCauses)
  check('tool-change record diffs tools added=[extra]', r6.diffFromPrevious?.tools.added.join(',') === 'extra', r6.diffFromPrevious?.tools)
  check('tool-change drop ranks tools-changed first', r6.diffFromPrevious?.likelyCauses?.[0] === 'tools-changed', r6.diffFromPrevious?.likelyCauses)
  check('same-header steps carry no structural diff', r1.diffFromPrevious?.tools.changed === false && r2.diffFromPrevious?.tools.changed === false)

  console.log('\n--- surface estimates ---')
  check('every record has a positive surface estimate', records.every(r => r.estimatedSurfaceTokens > 0), records.map(r => r.estimatedSurfaceTokens))
  check('surface estimate grows across the conversation', records[7]!.estimatedSurfaceTokens > records[0]!.estimatedSurfaceTokens)

  console.log('\n--- checkpoint path (plain-JSON state survives structuredClone) ---')
  let checkpointOk = false
  try {
    const rows = ctx.sessionProjections.checkpoint(agent.session)
    checkpointOk = rows['contextLens']?.ver === 1 && rows['contextLens']?.seq === agent.session.seq - 1
  } catch (error) {
    console.log(`    checkpoint threw: ${String(error)}`)
  }
  check('checkpoint row exists with stateVersion 1 at the current watermark', checkpointOk)

  sectionDispose()
  echoDispose()
  return failures
}

main()
  .then(code => {
    console.log(code === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${code} check(s) failed)`)
    process.exit(code === 0 ? 0 : 1)
  })
  .catch(error => {
    console.error('\nSMOKE ERROR:', error)
    process.exit(2)
  })
