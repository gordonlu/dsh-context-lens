/**
 * The Context Lens conversation view: a three-part reader over the
 * `contextLens` projection — an overview strip, the recent-requests list,
 * and the inspector for the selected request. Selection is component-local;
 * everything else arrives through the framework `useProjection` seat.
 */

import { useMemo, useState } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
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

  return (
    <section className={css.root}>
      <Overview
        summary={projection.summary}
        latest={latest}
        t={t}
      />
      <div className={css.layout}>
        <RequestList
          requests={requests}
          selectedId={effectiveSelectedId}
          onSelect={setSelectedId}
          t={t}
        />
        <RequestInspector
          request={requests.find(request => request.id === effectiveSelectedId) ?? null}
          t={t}
        />
      </div>
    </section>
  )
}
