/**
 * The recent-requests list: newest last, one card per request. The primary
 * line is the status (pill) with a dimmed turn:step tag; the secondary line
 * carries the model, the cache-reuse readout, and the structural-change /
 * cache-drop badges. The status carries the visual weight — the seq is
 * reference noise, not identity.
 */

import { useEffect, useMemo, useRef } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { RequestRecord } from '../types.ts'
import type { ContextLensKey } from './locales.ts'
import { formatPercent } from './format.ts'
import { NS } from './locales.ts'
import css from './context-lens.module.css'

export interface RequestListProps {
  requests: readonly RequestRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
  t: PropsLocale<typeof NS>['t']
}

function statusKey(status: RequestRecord['status']): ContextLensKey {
  return `list.status.${status}`
}

function cacheReadout(request: RequestRecord, t: PropsLocale<typeof NS>['t']): { text: string; drop: boolean } {
  if (request.cache?.reuse === undefined) return { text: t('list.cache.unavailable'), drop: false }
  return {
    text: t('list.cache', { percent: formatPercent(request.cache.reuse) }),
    drop: request.cache.drop === true,
  }
}

export function RequestList(props: RequestListProps) {
  const { requests, selectedId, onSelect, t } = props
  const selectedRef = useRef<HTMLButtonElement | null>(null)
  // The projection appends newest last; the list renders newest FIRST so the
  // live request sits at the top and the inspector stays in view.
  const ordered = useMemo(() => [...requests].reverse(), [requests])
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])
  if (requests.length === 0) {
    return <div className={css.list}>{t('list.empty')}</div>
  }
  return (
    <div className={css.list}>
      {ordered.map(request => {
        const changed = request.diffFromPrevious !== undefined && (
          request.diffFromPrevious.tools.changed
          || request.diffFromPrevious.system.changed
          || request.diffFromPrevious.modelChanged
          || request.diffFromPrevious.providerChanged
          || request.diffFromPrevious.configChanged
        )
        const cache = cacheReadout(request, t)
        return (
          <button
            key={request.id}
            type="button"
            ref={request.id === selectedId ? selectedRef : undefined}
            className={`${css.listItem} ${request.id === selectedId ? css.listItemSelected : ''}`}
            onClick={() => onSelect(request.id)}
          >
            <div className={css.itemLine}>
              <span className={`${css.statusPill} ${css[`statusPill_${request.status}`]}`}>
                {t(statusKey(request.status))}
              </span>
              <span className={css.seq}>{request.id}</span>
              <span className={`${css.cacheCell} ${cache.drop ? css.cacheCellDrop : ''}`}>{cache.text}</span>
            </div>
            <div className={css.itemLine}>
              <span className={css.modelCell}>{request.model ?? ''}</span>
              {(changed || cache.drop) && (
                <span className={css.badges}>
                  {changed && <span className={css.changedBadge}>{t('list.changed')}</span>}
                  {cache.drop && <span className={css.dropBadge}>{t('list.cache.drop')}</span>}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
