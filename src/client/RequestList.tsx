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
import { formatPercent, formatTokens } from './format.ts'
import { globalOrdinal, isUnchanged, requestTag, surfaceOnly } from './request-summary.ts'
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

function requestTime(time: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(time)
}

export function RequestList(props: RequestListProps) {
  const { requests, totalRequests, selectedId, onSelect, t } = props
  const selectedRef = useRef<HTMLButtonElement | null>(null)
  const [hideUnchanged, setHideUnchanged] = useState(true)
  // Second layer: hide surface-only growth too, leaving true events
  // (drops, structural changes, failures) in the default view.
  const [hideSurface, setHideSurface] = useState(true)
  // The projection appends newest last; the list renders newest FIRST so the
  // live request sits at the top and the inspector stays in view.
  const ordered = useMemo(() => [...requests].reverse(), [requests])
  const visible = useMemo(
    () => ordered.filter(request =>
      (!hideUnchanged || !isUnchanged(request)) &&
      (!hideSurface || !surfaceOnly(request)),
    ),
    [ordered, hideUnchanged, hideSurface],
  )
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, visible])

  if (requests.length === 0) {
    return <div className={css.list}>{t('list.empty')}</div>
  }
  return (
    <div className={css.list}>
      <div className={css.listHeader}>
        <span className={css.listTitle}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3.2 1.8" />
          </svg>
          {t('list.title')}
        </span>
        <span className={css.listCount}>{totalRequests}</span>
      </div>
      <label className={css.listToolbar}>
        <input
          type="checkbox"
          checked={hideUnchanged}
          onChange={event => setHideUnchanged(event.target.checked)}
        />
        <span>{t('list.hideUnchanged')}</span>
      </label>
      <label className={css.listToolbar}>
        <input
          type="checkbox"
          checked={hideSurface}
          onChange={event => setHideSurface(event.target.checked)}
        />
        <span>{t('list.hideSurface')}</span>
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
              <span className={css.listItemHead}>
                <span className={`${css.timelineIcon} ${tag.alarming ? css.timelineIconAlarm : ''}`}>
                  <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {tag.alarming
                      ? <><path d="M10 3 17 16H3L10 3Z" /><path d="M10 7.2v4.2M10 14h.01" /></>
                      : <><circle cx="10" cy="10" r="7" /><path d="m6.8 10.2 2 2 4.5-4.6" /></>}
                  </svg>
                </span>
                <span className={css.seq}>#{ordinal}</span>
                <span className={`${css.itemTag} ${tag.alarming ? css.itemTagAlarm : ''}`}>{tag.text}</span>
                <span className={css.itemTime}>{requestTime(request.time)}</span>
              </span>
              <span className={css.itemMetrics}>
                <span>+{request.usage?.inputTokens === undefined ? '—' : formatTokens(request.usage.inputTokens)} tok</span>
                <span>{formatTokens(request.estimatedSurfaceTokens)} ctx</span>
                <span className={`${css.cacheCell} ${cache.drop ? css.cacheCellDrop : ''}`}>{cache.text}</span>
              </span>
            </button>
          )
        })}
    </div>
  )
}
