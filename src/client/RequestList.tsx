/**
 * The recent-requests list: newest last, one row per request. Rows show the
 * request status, its cache-reuse readout (or `usage n/a`), and a marker
 * when the request's header changed structurally against its predecessor.
 */

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
  if (requests.length === 0) {
    return <div className={css.list}>{t('list.empty')}</div>
  }
  return (
    <div className={css.list}>
      {requests.map(request => {
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
            className={`${css.listItem} ${request.id === selectedId ? css.listItemSelected : ''}`}
            onClick={() => onSelect(request.id)}
          >
            <span className={css.seq}>{request.id}</span>
            <span className={css.status}>{t(statusKey(request.status))}</span>
            <span className={css.cacheCell}>{cache.text}</span>
            {changed && <span className={css.changedBadge}>{t('list.changed')}</span>}
            {cache.drop && <span className={css.dropBadge}>{t('list.cache.drop')}</span>}
          </button>
        )
      })}
    </div>
  )
}
