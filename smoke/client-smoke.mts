/**
 * client-smoke.mts — real-loader smoke for the dsh-context-lens browser half.
 *
 * Loads the BUILT lib/client.js exactly the way the real web app does: the
 * bundle calls `window.__ModuleLoader__.load({ id, factory })`, the factory
 * resolves every external through the loader's injected require, and the
 * module table keys are the shell's real PLATFORM_MODULES
 * (`@deepseek-ai/dsh-client-web/src/platform.ts`). Then mounts the returned
 * plugin object into a REAL client cordis context (SlotRegistry + the real
 * locale plugin) and asserts the `conversation.view` entry registers with
 * the right id/order and is removed on dispose. Also asserts the plugin
 * CSS tag lands in <head> during factory execution.
 *
 * Run from anywhere with the harness checkout's tsx (see server-smoke.mts
 * for the invocation; this script needs the checkout for jsdom + the real
 * client packages):
 *
 *   HARNESS=/data/code/deepseek-harness
 *   "$HARNESS/node_modules/.bin/tsx" \
 *     --tsconfig "$HARNESS/tsconfig.json" \
 *     smoke/client-smoke.mts
 *
 * @module dsh-context-lens/smoke
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
// Make the REAL client packages loadable under plain node: their sources
// import *.module.css, which their build pipeline inlines (see css-hook.mjs).
import { register } from 'node:module'
register(new URL('./css-hook.mjs', import.meta.url))
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'

const HERE = dirname(fileURLToPath(import.meta.url))
const BUNDLE_PATH = join(HERE, '..', 'lib', 'client.js')
const PLUGIN_ID = 'dsh-context-lens'

// jsdom comes from the harness checkout (not this repo's deps).
const HARNESS = process.env.DSH_SMOKE_HARNESS ?? '/data/code/deepseek-harness'
const requireFromHarness = createRequire(join(HARNESS, 'package.json'))
const { JSDOM } = requireFromHarness('jsdom') as typeof import('jsdom')

let failures = 0
function check(label: string, condition: boolean, detail?: unknown): void {
  const mark = condition ? 'PASS' : 'FAIL'
  if (!condition) failures += 1
  console.log(`  [${mark}] ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`)
}

interface Handoff {
  id: string
  factory: (require: (spec: string) => unknown) => Record<string, unknown>
}

async function main(): Promise<number> {
  console.log('=== dsh-context-lens client smoke (real loader ABI) ===')

  // 1. Browser globals, exactly what the real page provides.
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost/',
  })
  const win = dom.window as typeof globalThis & { __ModuleLoader__?: { load(h: Handoff): void } }
  // Node 22 already owns some of these (read-only navigator); only install
  // the ones the page would provide that are missing.
  for (const key of ['window', 'document', 'navigator', 'location', 'HTMLElement', 'Node', 'Element', 'CustomEvent', 'Event', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia'] as const) {
    if ((globalThis as Record<string, unknown>)[key] === undefined) {
      ;(globalThis as Record<string, unknown>)[key] = win[key as keyof typeof win]
    }
  }

  // 2. Load the built bundle the way the real loader does.
  const code = readFileSync(BUNDLE_PATH, 'utf8')
  let handoff: Handoff | undefined
  win.__ModuleLoader__ = { load: h => { handoff = h } }
  new Function(code)() // eslint-disable-line no-new-func -- deliberate built-bundle fixture
  check('bundle hands off through __ModuleLoader__.load', handoff !== undefined)
  check('handoff id is dsh-context-lens', handoff?.id === PLUGIN_ID, handoff?.id)

  // 3. Run the factory with the REAL module table (shell PLATFORM_MODULES
  //    + runtime registration). The built bundle only ever requires react
  //    and react/jsx-runtime (every other external is a type-only safety
  //    entry), so the DI-require set is small — but the config that produced
  //    the bundle must still match the shell's table exactly.
  const modules = new Map<string, unknown>([
    ['react', await import('react')],
    ['react/jsx-runtime', await import('react/jsx-runtime')],
    ['react-dom', await import('react-dom')],
  ])
  let unexpected: string | undefined
  const exports = handoff!.factory((spec: string) => {
    if (!modules.has(spec)) {
      unexpected = spec
      throw new Error(`unexpected require: ${spec}`)
    }
    return modules.get(spec)
  })
  check('factory resolves every external from the module table', unexpected === undefined, unexpected)
  check('exports.apply is a function', typeof exports.apply === 'function')
  check('exports.inject is slots + locale', JSON.stringify(exports.inject) === JSON.stringify(['slots', 'locale']), exports.inject)

  // 4. Externals config conformance: the bundle's external list must equal
  //    the shell's frozen PLATFORM_MODULES plus the runtime registration —
  //    a key drift means a miss-table crash in the real browser. The shell
  //    source is read directly (its package imports CSS, which plain node
  //    cannot load); the list is a pure static array literal.
  const platformSrc = readFileSync(join(HARNESS, 'packages/client/web/src/platform.ts'), 'utf8')
  const platformMatch = /export const PLATFORM_MODULES = \[([\s\S]*?)\]/.exec(platformSrc)
  if (platformMatch === null) throw new Error('client smoke: could not parse PLATFORM_MODULES from the shell source')
  const platformModules = [...platformMatch[1]!.matchAll(/'([^']+)'/g)].map(m => m[1]!)
  const { CLIENT_EXTERNALS } = await import('../tsdown.config.ts')
  const expected = [...platformModules, '@deepseek-ai/dsh-client-runtime/client'].sort()
  const actual = [...CLIENT_EXTERNALS].sort()
  check('CLIENT_EXTERNALS matches the shell PLATFORM_MODULES + runtime', JSON.stringify(actual) === JSON.stringify(expected),
    { actual, expected })

  // 4. Plugin CSS injected during factory execution.
  const styleTags = dom.window.document.querySelectorAll(`style[data-plugin=${JSON.stringify(PLUGIN_ID)}]`)
  check('plugin CSS tag injected into <head>', styleTags.length > 0, styleTags.length)

  // 5. Mount into a real client runtime ring: SlotRegistry + locale plugin.
  const ctx = new Context()
  const slots = new SlotRegistry(ctx)
  slots.register({
    name: 'root',
    children: { 'conversation.view': { kind: 'list', scope: 'session' } },
  }, () => null)
  ctx.provide('sessions', { binding: () => undefined } as never)
  ctx.provide('connection', { api: { settings: {} }, isLoopback: false } as never)
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  const locale = await import('@deepseek-ai/dsh-client-locale/client')
  ctx.plugin({ inject: [...locale.inject], apply: locale.apply })
  const fiber = ctx.plugin(exports as { apply: (ctx: Context) => void })
  await fiber.await()

  const entries = slots.entries('conversation.view')
  // The slot entry id is 'context-lens' (src/client/index.ts), distinct from
  // the loader module id 'dsh-context-lens'. The declared dictionary
  // namespace lives on the entry (StoredEntry.locale), not inside options.
  const lens = entries.find(entry => entry.options.id === 'context-lens')
  check('context-lens entry registered in conversation.view', lens !== undefined, entries.map(e => e.options.id))
  check('entry order is 30', lens?.options.order === 30, lens?.options.order)
  check('entry locale namespace is context-lens', lens?.locale === 'context-lens', lens?.locale)
  check('label resolves through the locale bind', typeof lens?.options.label === 'function'
    && typeof (lens.options.label as () => string)() === 'string',
  typeof lens?.options.label === 'function' ? (lens.options.label as () => string)() : undefined)

  await fiber.dispose()
  check('dispose removes the entry from the ring', slots.entries('conversation.view').length === 0)

  return failures
}

main()
  .then(code => {
    console.log(code === 0 ? '\nCLIENT SMOKE PASS' : `\nCLIENT SMOKE FAIL (${code} check(s) failed)`)
    process.exit(code === 0 ? 0 : 1)
  })
  .catch(error => {
    console.error('\nCLIENT SMOKE ERROR:', error)
    process.exit(2)
  })
