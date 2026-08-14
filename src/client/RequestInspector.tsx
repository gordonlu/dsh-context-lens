/**
 * The request inspector: everything the projection knows about one request —
 * meta, provider usage, header fingerprints, the diff against its
 * predecessor, and (on a cache drop) the rule-ranked list of coincident
 * changes with the correlation disclaimer.
 */

import { useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { LikelyCause, RequestRecord } from '../types.ts'
import type { ContextLensKey } from './locales.ts'
import { formatPercent, formatTokens, shortHash } from './format.ts'
import { NS } from './locales.ts'
import css from './context-lens.module.css'

export interface RequestInspectorProps {
  request: RequestRecord | null
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

function UsageRow(props: { label: string; value: number | undefined; t: PropsLocale<typeof NS>['t'] }) {
  const { label, value, t } = props
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={css.statValue}>{value === undefined ? t('inspector.unavailable') : formatTokens(value)}</span>
    </div>
  )
}

function HashRow(props: { label: string; hash: string | undefined; bytes?: number; count?: number; t: PropsLocale<typeof NS>['t'] }) {
  const { label, hash, bytes, count, t } = props
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={css.statValue}>
        {hash === undefined ? t('inspector.unavailable') : shortHash(hash)}
        {bytes !== undefined && <span className={css.dim}> · {formatTokens(bytes)}B</span>}
        {count !== undefined && <span className={css.dim}> · {count}</span>}
      </span>
    </div>
  )
}

function ToolsDiff(props: { added: string[]; removed: string[]; modified: string[]; t: PropsLocale<typeof NS>['t'] }) {
  const { added, removed, modified, t } = props
  if (added.length === 0 && removed.length === 0 && modified.length === 0) return null
  return (
    <div className={css.diffItem}>
      {t('inspector.diff.tools', {
        added: added.length === 0 ? '0' : cappedList(added, 4),
        removed: removed.length === 0 ? '0' : cappedList(removed, 4),
        modified: modified.length === 0 ? '0' : cappedList(modified, 4),
      })}
    </div>
  )
}

function ToolsOrderDiff(props: { orderChanged: boolean; t: PropsLocale<typeof NS>['t'] }) {
  const { orderChanged, t } = props
  if (!orderChanged) return null
  return (
    <div className={css.diffItem}>
      {t('inspector.diff.tools.order')}
      <span className={css.dim}> — {t('inspector.diff.tools.orderHint')}</span>
    </div>
  )
}

export function RequestInspector(props: RequestInspectorProps) {
  const { request, t } = props
  // The per-request tool detail is usually identical to every other request
  // in the session; keep it folded so the inspector leads with what changed.
  const [toolsOpen, setToolsOpen] = useState(false)
  if (request === null) return <div className={css.inspector}>{t('list.empty')}</div>
  const { usage, cache, header, diffFromPrevious } = request
  const diff = diffFromPrevious
  return (
    <div className={css.inspector}>
      {cache?.drop === true && cache.deltaPoints !== undefined && (
        <div className={css.banner}>
          {t('inspector.drop.banner', { delta: String(Math.round(Math.abs(cache.deltaPoints))) })}
        </div>
      )}
      <div className={css.panelTitle}>
        <span className={css.seq}>{request.id}</span>
        <span className={css.status}>{t(`list.status.${request.status}`)}</span>
        {request.model !== undefined && <span className={css.dim}>{request.model}</span>}
      </div>

      <div className={css.panel}>
        <div className={css.panelTitle}>{t('inspector.usage')}</div>
        <div className={css.stats}>
          <UsageRow label={t('inspector.input')} value={usage?.inputTokens} t={t} />
          <UsageRow label={t('inspector.cacheRead')} value={usage?.cacheReadTokens} t={t} />
          <UsageRow label={t('inspector.cacheWrite')} value={usage?.cacheWriteTokens} t={t} />
          <UsageRow label={t('inspector.output')} value={usage?.outputTokens} t={t} />
          <UsageRow label={t('inspector.reasoning')} value={usage?.reasoningTokens} t={t} />
          <UsageRow
            label={t('inspector.cacheReuse')}
            value={cache?.reuse === undefined ? undefined : Math.round(cache.reuse * 1000) / 10}
            t={t}
          />
          <UsageRow label={t('inspector.surface')} value={request.estimatedSurfaceTokens} t={t} />
        </div>
      </div>

      <div className={css.panel}>
        <div className={css.panelTitle}>{t('inspector.header')}</div>
        <div className={css.stats}>
          <HashRow label={t('inspector.configHash')} hash={header.configHash} t={t} />
          <HashRow
            label={t('inspector.systemHash')}
            hash={header.systemHash}
            {...header.systemBytes === undefined ? {} : { bytes: header.systemBytes }}
            t={t}
          />
          <HashRow label={t('inspector.tools', { count: String(header.toolCount ?? header.tools.length) })} hash={header.toolsHash} count={header.tools.length} t={t} />
          {request.contextWindow !== undefined && (
            <UsageRow label={t('inspector.contextWindow')} value={request.contextWindow} t={t} />
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
              {toolsOpen ? t('inspector.tools.hide') : t('inspector.tools.show', { count: String(header.tools.length) })}
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

      {diff !== undefined && (
        <div className={css.panel}>
          <div className={css.panelTitle}>{t('inspector.diff.title')}</div>
          {diff.modelChanged && request.model !== undefined && (
            <div className={css.diffItem}>{t('inspector.diff.model', { before: '?', after: request.model })}</div>
          )}
          {diff.providerChanged && request.provider !== undefined && (
            <div className={css.diffItem}>{t('inspector.diff.provider', { before: '?', after: request.provider })}</div>
          )}
          {diff.configChanged && <div className={css.diffItem}>{t('inspector.diff.config')}</div>}
          {diff.system.changed && <div className={css.diffItem}>{t('inspector.diff.system')}</div>}
          <ToolsDiff added={diff.tools.added} removed={diff.tools.removed} modified={diff.tools.modified} t={t} />
          <ToolsOrderDiff orderChanged={diff.tools.orderChanged} t={t} />
          {diff.surface.estimatedDeltaTokens !== undefined && diff.surface.estimatedDeltaTokens > 0 && (
            <div className={css.diffItem}>
              {t('inspector.diff.surface', { delta: formatTokens(diff.surface.estimatedDeltaTokens) })}
            </div>
          )}
          {diff.cache !== undefined
            && diff.cache.previousHitRate !== undefined
            && diff.cache.currentHitRate !== undefined && (
            <div className={css.diffItem}>
              {t('inspector.diff.cache', {
                before: formatPercent(diff.cache.previousHitRate / 100),
                after: formatPercent(diff.cache.currentHitRate / 100),
                delta: String(Math.round(diff.cache.deltaPoints ?? 0)),
              })}
            </div>
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
    </div>
  )
}
