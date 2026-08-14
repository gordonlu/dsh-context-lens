/**
 * The request inspector: change-first. The head names the request and its
 * one-line status; the primary readout shows cache reuse (with the delta vs
 * the predecessor), new uncached input, and the estimated context surface;
 * the comparison panel answers "what changed vs the previous request" line
 * by line; a conclusion line says whether anything looks cache-impacting.
 * Raw usage buckets, header hashes, and the full tool list live behind the
 * technical-details fold.
 */

import { useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { LikelyCause, RequestRecord } from '../types.ts'
import type { ContextLensKey } from './locales.ts'
import { formatPercent, formatTokens, shortHash } from './format.ts'
import { globalOrdinal, requestTag } from './request-summary.ts'
import { NS } from './locales.ts'
import css from './context-lens.module.css'

export interface RequestInspectorProps {
  request: RequestRecord | null
  /** Session-global ordinal of this request (head "#N"). */
  ordinal: number
  /** Session-global ordinal of the previous request (for the compare title). */
  previousOrdinal: number | null
  t: PropsLocale<typeof NS>['t']
}

const CAUSE_KEY: Readonly<Record<LikelyCause, ContextLensKey>> = {
  'model-or-provider-changed': 'cause.model-or-provider-changed',
  'system-changed': 'cause.system-changed',
  'tools-changed': 'cause.tools-changed',
  'config-changed': 'cause.config-changed',
  'surface-grew': 'cause.surface-grew',
  'no-obvious-change': 'cause.no-obvious-change',
}

type InspectorIconKind = 'request' | 'system' | 'tools' | 'order' | 'config' | 'model' | 'provider' | 'surface' | 'check'

function InspectorIcon(props: { kind: InspectorIconKind }) {
  const { kind } = props
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'request' && <><path d="M5 4.5h14v11H9l-4 4v-15Z" /><path d="M8 8h8M8 12h5" /></>}
      {kind === 'system' && <><path d="M5 4.5h14v12H8l-3 3v-15Z" /><path d="M9 9h6M9 12.5h4" /></>}
      {kind === 'tools' && <><path d="m14.5 5 4.5 4.5-9.8 9.8-4.5-4.5L14.5 5Z" /><path d="m12.5 7 4.5 4.5M7 12.5l4.5 4.5" /></>}
      {kind === 'order' && <><path d="M8 6h11M8 12h8M8 18h5" /><path d="m3.5 5 1 1 2-2M3.5 11l1 1 2-2M3.5 17l1 1 2-2" /></>}
      {kind === 'config' && <><path d="M4 7h8M16 7h4M4 17h4M12 17h8" /><circle cx="14" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>}
      {kind === 'model' && <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12v8.5" /></>}
      {kind === 'provider' && <><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5C9.7 18.1 8.5 15.3 8.5 12S9.7 5.9 12 3.5Z" /></>}
      {kind === 'surface' && <><path d="M4 15.5c2.4-5 5.2-5 8-1s5.5 4 8-2" /><path d="M4 19.5c2.4-5 5.2-5 8-1s5.5 4 8-2" /><path d="M4 11.5c2.4-5 5.2-5 8-1s5.5 4 8-2" /></>}
      {kind === 'check' && <><circle cx="12" cy="12" r="9" /><path d="m7.8 12.2 2.7 2.7 5.8-6" /></>}
    </svg>
  )
}

/** First `limit` items of a name list, ellipsized. */
function cappedList(names: readonly string[], limit: number): string {
  const shown = names.slice(0, limit)
  const text = shown.join(', ')
  return names.length > limit ? `${text}…` : text
}

/** One stat row of the primary readout. */
function MainStat(props: { label: string; value: string; detail?: string; alarm?: boolean; accent?: boolean }) {
  const { label, value, detail, alarm, accent } = props
  return (
    <div className={`${css.stat} ${accent === true ? css.statAccent : ''}`}>
      <span className={css.statLabel}>{label}</span>
      <span className={`${css.statValue} ${alarm === true ? css.statValueAlarm : ''}`}>
        {value}
        {detail !== undefined && <span className={css.dim}> {detail}</span>}
      </span>
    </div>
  )
}

/** One row of the comparison panel: label + verdict. */
function CompareRow(props: { label: string; verdict: string; changed?: boolean; kind: Exclude<InspectorIconKind, 'request' | 'check'> }) {
  const { label, verdict, changed, kind } = props
  return (
    <div className={css.compareRow} data-kind={kind}>
      <span className={css.compareLabel}><span className={css.compareMark}><InspectorIcon kind={kind} /></span>{label}</span>
      <span className={`${css.compareVerdict} ${changed === true ? css.compareVerdictChanged : ''}`}>{verdict}</span>
    </div>
  )
}

function ToolsDiff(props: { added: string[]; removed: string[]; modified: string[]; t: PropsLocale<typeof NS>['t'] }) {
  const { added, removed, modified, t } = props
  if (added.length === 0 && removed.length === 0 && modified.length === 0) return null
  return (
    <div className={css.compareDetail}>
      {t('inspector.diff.tools', {
        added: added.length === 0 ? '0' : cappedList(added, 4),
        removed: removed.length === 0 ? '0' : cappedList(removed, 4),
        modified: modified.length === 0 ? '0' : cappedList(modified, 4),
      })}
    </div>
  )
}

export function RequestInspector(props: RequestInspectorProps) {
  const { request, ordinal, previousOrdinal, t } = props
  const [techOpen, setTechOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  if (request === null) return <div className={css.inspector}>{t('list.empty')}</div>
  const { usage, cache, header, diffFromPrevious } = request
  const diff = diffFromPrevious
  const tag = requestTag(request, t)

  const drop = cache?.drop === true && cache.deltaPoints !== undefined
  const hasStructuralChange = diff !== undefined && (
    diff.tools.changed || diff.system.changed || diff.configChanged
    || diff.modelChanged || diff.providerChanged
  )
  const surfaceDelta = diff?.surface.estimatedDeltaTokens

  return (
    <div className={css.inspector}>
      {drop && (
        <div className={css.banner}>
          {t('inspector.drop.banner', { delta: String(Math.round(Math.abs(cache!.deltaPoints!))) })}
        </div>
      )}

      <div className={css.inspectorHead}>
        <div className={css.requestTitleGroup}>
          <span className={css.requestIcon}><InspectorIcon kind="request" /></span>
          <span className={css.requestTitle}>{t('inspector.request', { ordinal: String(ordinal) })}</span>
          <span className={`${css.statusPill} ${tag.alarming ? css.statusPillAlarm : css.statusPillOk}`}>{tag.text}</span>
          <span className={css.requestTime}>{new Date(request.time).toLocaleTimeString()}</span>
        </div>
        <div className={css.requestIdentity}>
          <span className={css.modelBadge}>{request.model ?? t('inspector.unavailable')}</span>
          {request.provider !== undefined && <span className={css.providerBadge}>{request.provider}</span>}
        </div>
      </div>

      <div className={css.panel}>
        <div className={css.stats}>
          <MainStat
            label={t('inspector.cacheReuse')}
            value={cache?.reuse === undefined
              ? t('inspector.unavailable')
              : `${formatPercent(cache.reuse)}%`}
            {...cache?.deltaPoints === undefined ? {} : {
              detail: cache.deltaPoints < 0
                ? t('inspector.deltaDown', { delta: String(Math.round(Math.abs(cache.deltaPoints))) })
                : t('inspector.deltaUp', { delta: String(Math.round(cache.deltaPoints)) }),
            }}
            alarm={cache?.drop === true}
            accent
          />
          <MainStat
            label={t('inspector.newInput')}
            value={usage?.inputTokens === undefined
              ? t('inspector.unavailable')
              : `${formatTokens(usage.inputTokens)} tok`}
          />
          <MainStat
            label={t('inspector.contextSurface')}
            value={`${formatTokens(request.estimatedSurfaceTokens)} tok`}
          />
          <MainStat
            label={t('inspector.cacheImpact')}
            value={cache?.deltaPoints === undefined ? '—' : `${Math.round(cache.deltaPoints)} pt`}
            {...cache?.deltaPoints === undefined || cache.deltaPoints === 0
              ? { detail: t('inspector.noChange') }
              : {}}
            alarm={cache?.drop === true}
          />
        </div>
      </div>

      {diff !== undefined && (
        <div className={css.panel}>
          <div className={css.panelTitle}>
            {previousOrdinal === null
              ? t('inspector.compare', { prev: '—' })
              : t('inspector.compare', { prev: `#${String(previousOrdinal)}` })}
          </div>
          <CompareRow
            kind="system"
            label={t('inspector.compare.system')}
            verdict={diff.system.changed ? t('inspector.changed') : t('inspector.noChange')}
            changed={diff.system.changed}
          />
          <CompareRow
            kind="tools"
            label={t('inspector.compare.tools')}
            verdict={diff.tools.changed
              ? (() => {
                const after = header.toolCount ?? header.tools.length
                const before = after - diff.tools.added.length + diff.tools.removed.length
                return t('inspector.compare.toolsChanged', { before: String(before), after: String(after) })
              })()
              : t('inspector.compare.toolsDetail', { count: String(header.toolCount ?? header.tools.length) })}
            changed={diff.tools.changed}
          />
          {diff.tools.changed && <ToolsDiff added={diff.tools.added} removed={diff.tools.removed} modified={diff.tools.modified} t={t} />}
          <CompareRow
            kind="order"
            label={t('inspector.compare.order')}
            verdict={diff.tools.orderChanged ? t('inspector.changed') : t('inspector.noChange')}
            changed={diff.tools.orderChanged}
          />
          {diff.tools.orderChanged && (
            <div className={css.compareDetail}>
              <span className={css.dim}>{t('inspector.diff.tools.orderHint')}</span>
            </div>
          )}
          <CompareRow
            kind="config"
            label={t('inspector.compare.config')}
            verdict={diff.configChanged ? t('inspector.changed') : t('inspector.noChange')}
            changed={diff.configChanged}
          />
          <CompareRow
            kind="model"
            label={t('inspector.compare.model')}
            verdict={diff.modelChanged
              ? `→ ${request.model ?? '?'}`
              : (request.model ?? t('inspector.noChange'))}
            changed={diff.modelChanged}
          />
          <CompareRow
            kind="provider"
            label={t('inspector.compare.provider')}
            verdict={diff.providerChanged
              ? `→ ${request.provider ?? '?'}`
              : t('inspector.noChange')}
            changed={diff.providerChanged}
          />
          {surfaceDelta !== undefined && surfaceDelta > 0 && (
            <CompareRow
              kind="surface"
              label={t('inspector.compare.surface')}
              verdict={t('inspector.compare.surfaceDelta', { delta: formatTokens(surfaceDelta) })}
              changed={surfaceDelta >= 1024}
            />
          )}
          {diff.likelyCauses !== undefined && (
            <div className={css.causeList}>
              <div className={css.panelTitle}>{t('inspector.likely.title')}</div>
              {diff.likelyCauses.map(cause => (
                <div key={cause} className={css.cause}>{t(CAUSE_KEY[cause])}</div>
              ))}
              <div className={css.dim}>{t('inspector.likely.hint')}</div>
            </div>
          )}
        </div>
      )}

      {drop === false && !hasStructuralChange && (
        <div className={css.conclusion}>
          <span className={css.conclusionMark}><InspectorIcon kind="check" /></span>
          <span>
            <strong>{t('inspector.conclusion.ok')}</strong>
            <small>{t('inspector.conclusion.detail')}</small>
          </span>
          <svg className={css.conclusionWave} viewBox="0 0 320 80" aria-hidden="true" fill="none">
            <path d="M0 50C54 10 104 78 164 40s98-18 156 10" />
            <path d="M0 60C62 20 112 86 172 48s96-16 148 6" />
            <path d="M14 38c48-30 94 22 144-2s94-28 148 4" />
          </svg>
        </div>
      )}

      <div className={css.techFold}>
        <button type="button" className={css.techToggle} onClick={() => setTechOpen(open => !open)}>
          <span className={css.techToggleIcon}>{techOpen ? '▾' : '▸'}</span>
          {techOpen ? t('inspector.tech.hide') : t('inspector.tech.show')}
        </button>
        {techOpen && (
          <div className={css.techBody}>
            <div className={css.panel}>
              <div className={css.panelTitle}>{t('inspector.usage')}</div>
              <div className={css.stats}>
                <MainStat
                  label={t('inspector.cacheRead')}
                  value={usage?.cacheReadTokens === undefined ? t('inspector.unavailable') : formatTokens(usage.cacheReadTokens)}
                />
                <MainStat
                  label={t('inspector.cacheWrite')}
                  value={usage?.cacheWriteTokens === undefined ? t('inspector.unavailable') : formatTokens(usage.cacheWriteTokens)}
                />
                <MainStat
                  label={t('inspector.output')}
                  value={usage?.outputTokens === undefined ? t('inspector.unavailable') : formatTokens(usage.outputTokens)}
                />
                <MainStat
                  label={t('inspector.reasoning')}
                  value={usage?.reasoningTokens === undefined ? t('inspector.unavailable') : formatTokens(usage.reasoningTokens)}
                />
                <MainStat
                  label={t('inspector.surface')}
                  value={`${formatTokens(request.estimatedSurfaceTokens)} tok`}
                />
                <MainStat
                  label={t('inspector.cacheReuse')}
                  value={cache?.reuse === undefined
                    ? t('inspector.unavailable')
                    : `${formatPercent(cache.reuse)}%`}
                />
              </div>
            </div>
            <div className={css.panel}>
              <div className={css.panelTitle}>{t('inspector.header')}</div>
              <div className={css.stats}>
                <MainStat label={t('inspector.configHash')} value={shortHash(header.configHash)} />
                <MainStat
                  label={t('inspector.systemHash')}
                  value={header.systemHash === undefined ? t('inspector.unavailable') : shortHash(header.systemHash)}
                  {...header.systemBytes === undefined ? {} : { detail: `${formatTokens(header.systemBytes)}B` }}
                />
                <MainStat
                  label={t('inspector.tools', { count: String(header.toolCount ?? header.tools.length) })}
                  value={header.toolsHash === undefined ? t('inspector.unavailable') : shortHash(header.toolsHash)}
                />
                {request.contextWindow !== undefined && (
                  <MainStat label={t('inspector.contextWindow')} value={formatTokens(request.contextWindow)} />
                )}
              </div>
              {header.tools.length > 0 && (
                <div className={css.toolsFold}>
                  <button
                    type="button"
                    className={css.toolsToggle}
                    onClick={() => setToolsOpen(open => !open)}
                  >
                    <span className={css.toolsToggleIcon}>{toolsOpen ? '▾' : '▸'}</span>
                    {toolsOpen
                      ? t('inspector.tools.hide')
                      : t('inspector.tools.show', { count: String(header.tools.length) })}
                  </button>
                  {toolsOpen && (
                    <div className={css.toolList}>
                      {header.tools.map(tool => (
                        <div key={tool.name} className={css.toolRow}>
                          <span className={css.toolName}>{tool.name}</span>
                          <span className={css.mono}>{shortHash(tool.schemaHash)}</span>
                          <span className={css.dim}>{formatTokens(tool.estimatedTokens)} tok</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
