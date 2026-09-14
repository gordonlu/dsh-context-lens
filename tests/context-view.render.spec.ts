/**
 * Render smoke for the lens view.
 *
 * The loader-ABI smoke proves the bundle mounts and registers a slot entry; it
 * never renders React, so a view that registers fine and then throws on first
 * render passed every check we had. 0.3.0 shipped exactly that: the entry read
 * `snapshot.nodes`, which the 0.1.5 conversation shell no longer publishes, and
 * the slot showed a crash instead of the panel.
 *
 * These cases render the real component with the real dictionaries through
 * `react-dom/server` (effects do not run, which is fine — the failure mode is
 * in the render pass itself) against every snapshot shape a host may hand over.
 */

import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextView, type ContextLensViewProps } from '../src/client/ContextView.tsx'
import { zh } from '../src/client/locales.ts'
import type { ContextLensProjection, RequestRecord } from '../src/types.ts'

/** One finalized request, the minimum the full panel path needs. */
const record: RequestRecord = {
  id: '1:1',
  turn: 1,
  step: 1,
  seq: 2,
  time: 0,
  status: 'completed',
  header: { configHash: 'cfg', tools: [] },
  estimatedSurfaceTokens: 120,
}

const projection: ContextLensProjection = {
  latest: record,
  recentRequests: [record],
  summary: { totalRequests: 1, cacheDrops: 0, structuralChanges: 0, lastDropOrdinal: 0 },
}

/** The projection's dictionary lookup, with `{placeholder}` interpolation. */
function t(key: string, params?: Record<string, string>): string {
  const raw = (zh as Record<string, string>)[key] ?? key
  if (params === undefined) return raw
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match)
}

/** View props as the framework delivers them, with test doubles for the hooks. */
function propsFor(snapshot: unknown, lensProjection: ContextLensProjection | undefined): ContextLensViewProps {
  return {
    useProjection: (key: string) => (key === 'contextLens' ? lensProjection : undefined),
    useSession: (selector: (value: unknown) => unknown) => selector(snapshot),
    t,
    sessionId: 'lens-test',
  } as unknown as ContextLensViewProps
}

/**
 * Render the view. `null` means "the projection capability is absent" — an
 * explicit `undefined` would trip the default parameter instead.
 */
function render(snapshot: unknown, lensProjection: ContextLensProjection | null = projection): string {
  return renderToStaticMarkup(createElement(ContextView, propsFor(snapshot, lensProjection ?? undefined)))
}

/** The 0.1.5 snapshot: a target store, with the Chat target publishing order. */
function targetStore(order: readonly string[] | undefined) {
  return {
    views: { get: (target: string) => (target === 'chat' && order !== undefined ? { order } : undefined) },
    activeTargets: new Set(['chat']),
  }
}

describe('ContextView render smoke', () => {
  it('renders the full panel from the 0.1.5 target-store snapshot', () => {
    const html = render(targetStore(['n1', 'n2']))
    expect(html).toContain('请求 #1')
    expect(html).toContain('缓存复用')
    expect(html).toContain('最近请求')
  })

  it('renders from the legacy top-level nodes array', () => {
    expect(render({ nodes: [{}, {}] })).toContain('请求 #1')
  })

  it('renders when the snapshot exposes neither shape', () => {
    for (const snapshot of [{}, { views: {} }, { views: { get: () => undefined } }, null, undefined, 42]) {
      expect(render(snapshot)).toContain('请求 #1')
    }
  })

  it('renders the empty state when the projection is absent', () => {
    const html = render(targetStore([]), null)
    expect(html).toContain('暂无数据')
  })

  it('renders the empty state when no request has landed yet', () => {
    const empty: ContextLensProjection = {
      recentRequests: [],
      summary: { totalRequests: 0, cacheDrops: 0, structuralChanges: 0, lastDropOrdinal: 0 },
    }
    expect(render(targetStore([]), empty)).toContain('暂无数据')
  })
})
