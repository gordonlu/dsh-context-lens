/**
 * The session status strip: does this session need attention? Healthy shows
 * two green marks plus the analyzed-request count; the first cache drop or
 * structural change flips the marks to alarm-style counts.
 */

import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ContextLensSummary } from '../types.ts'
import { NS } from './locales.ts'
import css from './context-lens.module.css'

export interface OverviewProps {
  summary: ContextLensSummary
  t: PropsLocale<typeof NS>['t']
}

export function Overview(props: OverviewProps) {
  const { summary, t } = props
  const drops = summary.cacheDrops
  const structural = summary.structuralChanges
  return (
    <div className={css.overview}>
      <div className={css.statusChips}>
        {drops === 0
          ? <span className={`${css.statusChip} ${css.statusChipOk}`}>✓ {t('overview.cacheStable')}</span>
          : <span className={`${css.statusChip} ${css.statusChipBad}`}>⚠ {t('overview.cacheDrops', { count: String(drops) })}</span>}
        {structural === 0
          ? <span className={`${css.statusChip} ${css.statusChipOk}`}>✓ {t('overview.structureStable')}</span>
          : <span className={`${css.statusChip} ${css.statusChipBad}`}>⚠ {t('overview.structureChanges', { count: String(structural) })}</span>}
        <span className={css.overviewCount}>
          {t('overview.requests', { count: String(summary.totalRequests) })}
        </span>
      </div>
    </div>
  )
}
