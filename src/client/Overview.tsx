/**
 * The session status strip: does this session need attention? Healthy shows
 * two green marks plus the analyzed-request count; the first cache drop or
 * structural change flips the marks to alarm-style counts.
 */

import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ContextLensSummary, RequestRecord } from '../types.ts'
import { NS } from './locales.ts'
import { formatPercent } from './format.ts'
import css from './context-lens.module.css'

export interface OverviewProps {
  summary: ContextLensSummary
  requests: readonly RequestRecord[]
  t: PropsLocale<typeof NS>['t']
}

/** A session is unhealthy only while the latest cache drop sits inside this window. */
export const HEALTH_WINDOW = 20

type OverviewIconKind = 'health' | 'requests' | 'cache' | 'structure' | 'drop'

function OverviewIcon(props: { kind: OverviewIconKind }) {
  const { kind } = props
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'health' && <><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="m8.4 12.2 2.2 2.2 5-5.2" /></>}
      {kind === 'requests' && <><path d="M7 7h10M7 12h10M7 17h6" /><path d="M4 5.5v13M20 5.5v13" /></>}
      {kind === 'cache' && <><path d="M4.5 8.5A8 8 0 0 1 18.6 6" /><path d="m18.5 2 .1 4.1-4.1-.1" /><path d="M19.5 15.5A8 8 0 0 1 5.4 18" /><path d="m5.5 22-.1-4.1 4.1.1" /></>}
      {kind === 'structure' && <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="9" y="14" width="6" height="6" rx="1.5" /><path d="M7 10v2h10v-2M12 12v2" /></>}
      {kind === 'drop' && <><path d="M5 5v14h14" /><path d="m7.5 9.5 4 4 3-3 4 5" /></>}
    </svg>
  )
}

function OverviewCard(props: {
  icon: OverviewIconKind
  label: string
  value: string
  meta?: string
  tone?: 'ok' | 'bad'
}) {
  const { icon, label, value, meta, tone } = props
  return (
    <div className={`${css.overviewCard} ${tone === 'ok' ? css.overviewCardOk : ''} ${tone === 'bad' ? css.overviewCardBad : ''}`}>
      <span className={css.overviewIcon}><OverviewIcon kind={icon} /></span>
      <span className={css.overviewCardBody}>
        <span className={css.overviewLabel}>{label}</span>
        <span className={css.overviewReading}>
          <strong>{value}</strong>
          {meta !== undefined && <small>{meta}</small>}
        </span>
      </span>
    </div>
  )
}

export function Overview(props: OverviewProps) {
  const { summary, requests, t } = props
  const drops = summary.cacheDrops
  const structural = summary.structuralChanges
  const latestReuse = requests[requests.length - 1]?.cache?.reuse
  // Health is WINDOWED, not cumulative: a session with an old drop recovers
  // once the drop leaves the recent window. The cumulative count still lives
  // on the drop card below.
  const lastDropOrdinal = summary.lastDropOrdinal
  const unstable = lastDropOrdinal > 0 && summary.totalRequests - lastDropOrdinal <= HEALTH_WINDOW
  return (
    <div className={css.overview}>
      <div className={css.statusChips}>
        <OverviewCard
          icon="health"
          label={t('overview.health')}
          value={!unstable ? `✓ ${t('overview.cacheStable')}` : t('overview.cacheDrops', { count: String(drops) })}
          {...!unstable && lastDropOrdinal > 0 ? { meta: t('overview.recovered', { count: String(HEALTH_WINDOW) }) } : {}}
          tone={!unstable ? 'ok' : 'bad'}
        />
        <OverviewCard icon="requests" label={t('overview.requestCount')} value={String(summary.totalRequests)} meta={t('overview.requests', { count: String(summary.totalRequests) })} />
        <OverviewCard icon="cache" label={t('overview.hitRate')} value={latestReuse === undefined ? '—' : `${formatPercent(latestReuse)}%`} meta={t('inspector.cacheReuse')} />
        <OverviewCard icon="structure" label={t('overview.structure')} value={String(structural)} meta={structural === 0 ? `✓ ${t('overview.structureStable')}` : t('overview.structureChanges', { count: String(structural) })} {...structural > 0 ? { tone: 'bad' as const } : {}} />
        <OverviewCard icon="drop" label={t('overview.dropCount')} value={String(drops)} meta={drops === 0 ? t('overview.none') : t('overview.needsAttention')} {...drops > 0 ? { tone: 'bad' as const } : {}} />
      </div>
    </div>
  )
}
