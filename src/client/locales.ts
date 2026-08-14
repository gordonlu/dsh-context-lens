/**
 * dsh-context-lens client dictionaries and the `context-lens` locale
 * namespace. `ContextLensKey` is the union of every copy key; it is declared
 * into the framework's merge-extensible `LocaleNamespaceMap`, which types the
 * `t` seat on the view component props.
 *
 * The copy is change-first: the default view answers "is anything wrong, and
 * where?" in one glance; raw fingerprints, full usage buckets, and the tool
 * list live behind the technical-details fold.
 *
 * @module dsh-context-lens/client/locales
 */

export const NS = 'context-lens' as const

/** Chinese product copy (primary). */
export const zh = {
  'view.context': '请求上下文',

  // Session status strip.
  'overview.requests': '{count} 次请求',
  'overview.cacheStable': '缓存稳定',
  'overview.cacheDrops': '{count} 次缓存回落',
  'overview.structureStable': '结构稳定',
  'overview.structureChanges': '{count} 次结构变化',
  'overview.health': '会话健康度',
  'overview.requestCount': '请求数',
  'overview.hitRate': '缓存命中率',
  'overview.structure': '结构变化',
  'overview.dropCount': '缓存回落',
  'overview.none': '未发生',
  'overview.needsAttention': '需要关注',
  'overview.recovered': '近 {count} 个请求无回落',

  // Request list.
  'list.title': '最近请求',
  'list.empty': '还没有 LLM 请求。发送一条消息后这里会出现每次请求的变化与缓存复用情况。',
  'list.filtered.empty': '最近请求均无值得关注的变化。取消勾选过滤可查看全部。',
  'list.hideUnchanged': '隐藏无变化请求',
  'list.hideSurface': '隐藏仅上下文增长',
  'list.cache': '缓存 {percent}%',
  'list.cache.drop': '缓存回落',
  'list.cache.unavailable': '用量 n/a',
  'list.tag.stable': '稳定',
  'list.tag.drop': '缓存回落',
  'list.tag.tools': '工具变化',
  'list.tag.system': '系统变化',
  'list.tag.config': '配置变化',
  'list.tag.model': '模型变化',
  'list.tag.provider': '服务商变化',
  'list.tag.surface': '+{delta} tok',
  'list.status.completed': '完成',
  'list.status.failed': '失败',
  'list.status.aborted': '中止',

  // Inspector: primary readout.
  'inspector.cacheReuse': '缓存复用',
  'inspector.newInput': '新增输入',
  'inspector.contextSurface': '估算请求上下文',
  'inspector.cacheImpact': '缓存影响',
  'inspector.request': '请求 #{ordinal}',
  'inspector.deltaUp': '↑{delta} 个百分点',
  'inspector.deltaDown': '↓{delta} 个百分点',
  'inspector.unavailable': '-',

  // Inspector: comparison vs the previous request.
  'inspector.compare': '对比 {prev}',
  'inspector.noChange': '无变化',
  'inspector.changed': '有变化',
  'inspector.compare.system': '系统提示',
  'inspector.compare.tools': '工具',
  'inspector.compare.toolsDetail': '无变化 · {count} 个工具',
  'inspector.compare.toolsChanged': '{before} → {after}',
  'inspector.compare.order': '工具顺序',
  'inspector.compare.config': '配置',
  'inspector.compare.model': '模型',
  'inspector.compare.provider': '服务商',
  'inspector.compare.surface': '上下文',
  'inspector.compare.surfaceDelta': '+{delta} tok',
  'inspector.diff.tools': '工具 +{added} −{removed} ~{modified}',
  'inspector.diff.tools.orderHint': '结构与模式未变，但声明顺序改变，可能影响 provider 序列化与前缀缓存。',
  'inspector.likely.title': '同时发生的变化',
  'inspector.likely.hint': '仅相关，不构成因果。',
  'inspector.conclusion.ok': '未检测到影响缓存的请求变化。',
  'inspector.conclusion.detail': '当前请求结构保持稳定，缓存性能未见结构性风险。',
  'inspector.drop.banner': '缓存复用较上次请求回落 {delta} 个百分点',
  'cause.model-or-provider-changed': '模型或服务商变化',
  'cause.system-changed': '系统提示变化',
  'cause.tools-changed': '工具集变化',
  'cause.config-changed': '请求配置变化',
  'cause.surface-grew': '对话表面增长',
  'cause.no-obvious-change': '无明显的请求变化',

  // Inspector: technical details (folded by default).
  'inspector.tech.show': '查看技术细节',
  'inspector.tech.hide': '收起技术细节',
  'inspector.usage': '用量',
  'inspector.input': '输入(未缓存)',
  'inspector.cacheRead': '缓存读取',
  'inspector.cacheWrite': '缓存写入',
  'inspector.output': '输出',
  'inspector.reasoning': '推理',
  'inspector.surface': '估算请求上下文',
  'inspector.header': '请求头部',
  'inspector.configHash': '配置',
  'inspector.systemHash': '系统提示',
  'inspector.tools': '工具 {count}',
  'inspector.tools.show': '查看全部 {count} 个工具',
  'inspector.tools.hide': '收起工具列表',
  'inspector.contextWindow': '上下文窗口',

  'empty.title': '暂无数据',
  'empty.hint': 'Context Lens 会在 LLM 请求开始流动后自动观察。',
} as const

/** English product copy (secondary). */
export const en: Record<keyof typeof zh, string> = {
  'view.context': 'Request Context',

  'overview.requests': '{count} requests',
  'overview.cacheStable': 'Cache stable',
  'overview.cacheDrops': '{count} cache drops',
  'overview.structureStable': 'Structure stable',
  'overview.structureChanges': '{count} structural changes',
  'overview.health': 'Session health',
  'overview.requestCount': 'Requests',
  'overview.hitRate': 'Cache hit rate',
  'overview.structure': 'Structure changes',
  'overview.dropCount': 'Cache drops',
  'overview.none': 'None',
  'overview.needsAttention': 'Needs attention',
  'overview.recovered': 'No drops in the last {count} requests',

  'list.title': 'Recent requests',
  'list.empty': 'No LLM requests yet. Send a message and each request\'s changes and cache reuse will appear here.',
  'list.filtered.empty': 'All recent requests have nothing worth attention. Untick the filters to see them.',
  'list.hideUnchanged': 'Hide unchanged requests',
  'list.hideSurface': 'Hide surface-only growth',
  'list.cache': 'cache {percent}%',
  'list.cache.drop': 'cache drop',
  'list.cache.unavailable': 'usage n/a',
  'list.tag.stable': 'Stable',
  'list.tag.drop': 'Cache drop',
  'list.tag.tools': 'Tools changed',
  'list.tag.system': 'System changed',
  'list.tag.config': 'Config changed',
  'list.tag.model': 'Model changed',
  'list.tag.provider': 'Provider changed',
  'list.tag.surface': '+{delta} tok',
  'list.status.completed': 'completed',
  'list.status.failed': 'failed',
  'list.status.aborted': 'aborted',

  'inspector.cacheReuse': 'Cache reuse',
  'inspector.newInput': 'New input',
  'inspector.contextSurface': 'Context surface',
  'inspector.cacheImpact': 'Cache impact',
  'inspector.request': 'Request #{ordinal}',
  'inspector.deltaUp': '↑{delta}%',
  'inspector.deltaDown': '↓{delta}%',
  'inspector.unavailable': '-',

  'inspector.compare': 'vs {prev}',
  'inspector.noChange': 'No change',
  'inspector.changed': 'Changed',
  'inspector.compare.system': 'System prompt',
  'inspector.compare.tools': 'Tools',
  'inspector.compare.toolsDetail': 'No change · {count} tools',
  'inspector.compare.toolsChanged': '{before} → {after}',
  'inspector.compare.order': 'Tool order',
  'inspector.compare.config': 'Config',
  'inspector.compare.model': 'Model',
  'inspector.compare.provider': 'Provider',
  'inspector.compare.surface': 'Context',
  'inspector.compare.surfaceDelta': '+{delta} tok',
  'inspector.diff.tools': 'Tools +{added} −{removed} ~{modified}',
  'inspector.diff.tools.orderHint': 'Set and schemas unchanged, but declaration order changed — this can affect provider serialization and the prefix cache.',
  'inspector.likely.title': 'Coincident changes',
  'inspector.likely.hint': 'Correlation only — not causation.',
  'inspector.conclusion.ok': 'No cache-impacting request changes detected.',
  'inspector.conclusion.detail': 'Request structure remains stable with no structural risk to cache performance.',
  'inspector.drop.banner': 'Cache reuse dropped {delta}% vs previous request',
  'cause.model-or-provider-changed': 'Model or provider changed',
  'cause.system-changed': 'System prompt changed',
  'cause.tools-changed': 'Tool set changed',
  'cause.config-changed': 'Request config changed',
  'cause.surface-grew': 'Conversation surface grew',
  'cause.no-obvious-change': 'No obvious request change',

  'inspector.tech.show': 'Show technical details',
  'inspector.tech.hide': 'Hide technical details',
  'inspector.usage': 'Usage',
  'inspector.input': 'Input (uncached)',
  'inspector.cacheRead': 'Cache read',
  'inspector.cacheWrite': 'Cache write',
  'inspector.output': 'Output',
  'inspector.reasoning': 'Reasoning',
  'inspector.surface': 'Context surface',
  'inspector.header': 'Request header',
  'inspector.configHash': 'Config',
  'inspector.systemHash': 'System prompt',
  'inspector.tools': 'Tools {count}',
  'inspector.tools.show': 'View all {count} tools',
  'inspector.tools.hide': 'Hide tool list',
  'inspector.contextWindow': 'Context window',

  'empty.title': 'No data yet',
  'empty.hint': 'Context Lens observes LLM requests once they start flowing.',
}

/** Union of every copy key in this namespace. */
export type ContextLensKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Context Lens view's copy. */
    'context-lens': ContextLensKey
  }
}
