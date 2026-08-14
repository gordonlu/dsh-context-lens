/**
 * The recent-requests list: newest first, one card per request, each card
 * summarized to ONE line of meaning — the session-global ordinal, the
 * change tag (stable / cache drop / tools changed / …), and the cache
 * readout. Unchanged requests are hidden by default so the list answers
 * "where are the interesting requests?" instead of scrolling 358 identical
 * rows.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { RequestRecord } from '../types.ts'
import type { ContextLensKey } from './locales.ts'
import { formatPercent } from './format.ts'
import { globalOrdinal, isUnchanged, requestTag } from './request-summary.ts'
import { NS } from './locales.ts'
import css from './context-lens.module.css'

export interface RequestListProps {
  requests: readonly RequestRecord[]
  totalRequests: number
  selectedId: string | null
  onSelect: (id: string) => void
  t: PropsLocale<typeof NS>['t']
}

function cacheReadout(request: RequestRecord, t: PropsLocale<typeof NS>['t']): { text: string; drop: boolean } {
  if (request.cache?.reuse === undefined) return { text: t('list.cache.unavailable'), drop: false }
  return {
    text: t('list.cache', { percent: formatPercent(request.cache.reuse) }),
    drop: request.cache.drop === true,
  }
}

export function RequestList(props: RequestListProps) {
  const { requests, totalRequests, selectedId, onSelect, t } = props
  const selectedRef = useRef<HTMLButtonElement | null>(null)
  const [hideUnchanged, setHideUnchanged] = useState(true)
  // The projection appends newest last; the list renders newest FIRST so the
  // live request sits at the top and the inspector stays in view.
  const ordered = useMemo(() => [...requests].reverse(), [requests])
  const visible = useMemo(
    () => ordered.filter(request => !hideUnchanged || !isUnchanged(request)),
    [ordered, hideUnchanged],
  )
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, visible])

  if (requests.length === 0) {
    return <div className={css.list}>{t('list.empty')}</div>
  }
  return (
    <div className={css.list}>
      <label className={css.listToolbar}>
        <input
          type="checkbox"
          checked={hideUnchanged}
          onChange={event => setHideUnchanged(event.target.checked)}
        />
        <span>{t('list.hideUnchanged')}</span>
      </label>
      {visible.length === 0
        ? <div className={css.listEmpty}>{t('list.filtered.empty')}</div>
        : visible.map(request => {
          const tag = requestTag(request, t)
          const cache = cacheReadout(request, t)
          const ordinal = globalOrdinal(
            requests.indexOf(request),
            requests.length,
            totalRequests,
          )
          return (
            <button
              key={request.id}
              type="button"
              ref={request.id === selectedId ? selectedRef : undefined}
              className={`${css.listItem} ${request.id === selectedId ? css.listItemSelected : ''}`}
              onClick={() => onSelect(request.id)}
            >
              <span className={css.seq}>#{ordinal}</span>
              <span className={`${css.itemTag} ${tag.alarming ? css.itemTagAlarm : ''}`}>{tag.text}</span>
              <span className={`${css.cacheCell} ${cache.drop ? css.cacheCellDrop : ''}`}>{cache.text}</span>
            </button>
          )
        })}
    </div>
  )
}
