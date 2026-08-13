/**
 * The overview strip: session counters plus the latest request's cache-reuse
 * readout, with an alarm banner when the latest request's cache reuse
 * dropped.
 */

import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ContextLensSummary, RequestRecord } from '../types.ts'
import { NS } from './locales.ts'
import { formatPercent } from './format.ts'
import css from './context-lens.module.css'

export interface OverviewProps {
  summary: ContextLensSummary
  latest: RequestRecord | undefined
  t: PropsLocale<typeof NS>['t']
}

export function Overview(props: OverviewProps) {
  const { summary, latest, t } = props
  const drop = latest?.cache?.drop === true ? latest.cache : undefined
  return (
    <div className={css.overview}>
      <div className={css.chips}>
        <div className={css.chip}>
          <span className={css.chipLabel}>{t('overview.requests')}</span>
          <span className={css.chipValue}>{summary.totalRequests}</span>
        </div>
        <div className={css.chip}>
          <span className={css.chipLabel}>{t('overview.cacheDrops')}</span>
          <span className={`${css.chipValue} ${summary.cacheDrops > 0 ? css.chipDanger : ''}`}>
            {summary.cacheDrops}
          </span>
        </div>
        <div className={css.chip}>
          <span className={css.chipLabel}>{t('overview.structuralChanges')}</span>
          <span className={css.chipValue}>{summary.structuralChanges}</span>
        </div>
      </div>
      {drop !== undefined && drop.deltaPoints !== undefined && (
        <div className={css.banner}>
          {t('inspector.drop.banner', { delta: String(Math.round(Math.abs(drop.deltaPoints))) })}
        </div>
      )}
    </div>
  )
}
