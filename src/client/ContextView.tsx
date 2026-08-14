/**
 * The Context Lens conversation view: a three-part reader over the
 * `contextLens` projection — an overview strip, the recent-requests list,
 * and the inspector for the selected request. Selection is component-local;
 * everything else arrives through the framework `useProjection` seat.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { globalOrdinal } from './request-summary.ts'
import { NS } from './locales.ts'
import { Overview } from './Overview.tsx'
import { RequestInspector } from './RequestInspector.tsx'
import { RequestList } from './RequestList.tsx'
import css from './context-lens.module.css'

export type ContextLensViewProps = ConvViewProps & PropsLocale<typeof NS>

/** The most recently finalized request's id, when a projection is present. */
function latestRequestId(requests: readonly { id: string }[]): string | null {
  const latest = requests[requests.length - 1]
  return latest === undefined ? null : latest.id
}

export function ContextView(props: ContextLensViewProps) {
  const { useProjection, t } = props
  const projection = useProjection('contextLens')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)

  // The conversation session's scrollport is SHARED across the view tabs
  // (Chat / Trajectory / Context Lens). Switching tabs swaps the content but
  // keeps the scroll position, so the lens panel would open scrolled into the
  // middle of nothing. The slot re-mounts this view on every activation
  // (`renderSlot` with `only: active.id`), so resetting the scrollport on
  // mount puts the panel top in view exactly when the user switches to it.
  useEffect(() => {
    let node: HTMLElement | null = rootRef.current
    let scroller: HTMLElement | null = null
    while (node !== null) {
      if (node.scrollHeight > node.clientHeight + 4) {
        scroller = node
        break
      }
      node = node.parentElement
    }
    if (scroller === null) return
    // Enter at the top of the panel; restore the user's prior stream
    // position when they switch back to Chat.
    const enterTop = scroller.scrollTop
    scroller.scrollTop = 0
    return () => {
      scroller.scrollTop = enterTop
    }
  }, [])

  const requests = useMemo(() => projection?.recentRequests ?? [], [projection])
  const selected = useMemo(
    () => requests.find(request => request.id === selectedId),
    [requests, selectedId],
  )

  if (projection === undefined || requests.length === 0) {
    return (
      <section className={css.root}>
        <div className={css.empty}>
          <div className={css.emptyTitle}>{t('empty.title')}</div>
          <div className={css.emptyHint}>{t('empty.hint')}</div>
        </div>
      </section>
    )
  }

  const latest = projection.latest ?? requests[requests.length - 1]
  const effectiveSelectedId = selected === undefined ? latestRequestId(requests) : selectedId
  const selectedIndex = requests.findIndex(request => request.id === effectiveSelectedId)
  const ordinal = selectedIndex === -1 ? 0 : globalOrdinal(selectedIndex, requests.length, projection.summary.totalRequests)
  const previousOrdinal = selectedIndex <= 0 ? null : globalOrdinal(selectedIndex - 1, requests.length, projection.summary.totalRequests)

  return (
    <section ref={rootRef} className={css.root}>
      <Overview
        summary={projection.summary}
        requests={requests}
        t={t}
      />
      <div className={css.layout}>
        <RequestList
          requests={requests}
          totalRequests={projection.summary.totalRequests}
          selectedId={effectiveSelectedId}
          onSelect={setSelectedId}
          t={t}
        />
        <RequestInspector
          request={requests.find(request => request.id === effectiveSelectedId) ?? null}
          ordinal={ordinal}
          previousOrdinal={previousOrdinal}
          t={t}
        />
      </div>
    </section>
  )
}
