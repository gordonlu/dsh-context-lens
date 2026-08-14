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

/** First `limit` items of a name list, ellipsized. */
function cappedList(names: readonly string[], limit: number): string {
  const shown = names.slice(0, limit)
  const text = shown.join(', ')
  return names.length > limit ? `${text}…` : text
}

/** One stat row of the primary readout. */
function MainStat(props: { label: string; value: string; detail?: string; alarm?: boolean }) {
  const { label, value, detail, alarm } = props
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={`${css.statValue} ${alarm === true ? css.statValueAlarm : ''}`}>
        {value}
        {detail !== undefined && <span className={css.dim}> {detail}</span>}
      </span>
    </div>
  )
}

/** One row of the comparison panel: label + verdict. */
function CompareRow(props: { label: string; verdict: string; changed?: boolean }) {
  const { label, verdict, changed } = props
  return (
    <div className={css.compareRow}>
      <span className={css.compareLabel}>{label}</span>
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
        <span className={css.seq}>#{ordinal}</span>
        <span className={`${css.statusPill} ${tag.alarming ? css.statusPillAlarm : css.statusPillOk}`}>{tag.text}</span>
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
            label={t('inspector.compare.system')}
            verdict={diff.system.changed ? t('inspector.changed') : t('inspector.noChange')}
            changed={diff.system.changed}
          />
          <CompareRow
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
            label={t('inspector.compare.config')}
            verdict={diff.configChanged ? t('inspector.changed') : t('inspector.noChange')}
            changed={diff.configChanged}
          />
          <CompareRow
            label={t('inspector.compare.model')}
            verdict={diff.modelChanged
              ? `→ ${request.model ?? '?'}`
              : (request.model ?? t('inspector.noChange'))}
            changed={diff.modelChanged}
          />
          <CompareRow
            label={t('inspector.compare.provider')}
            verdict={diff.providerChanged
              ? `→ ${request.provider ?? '?'}`
              : t('inspector.noChange')}
            changed={diff.providerChanged}
          />
          {surfaceDelta !== undefined && surfaceDelta > 0 && (
            <CompareRow
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
        <div className={css.conclusion}>{t('inspector.conclusion.ok')}</div>
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
