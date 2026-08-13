/**
 * dsh-context-lens client dictionaries and the `context-lens` locale
 * namespace. `ContextLensKey` is the union of every copy key; it is declared
 * into the framework's merge-extensible `LocaleNamespaceMap`, which types the
 * `t` seat on the view component props.
 *
 * @module dsh-context-lens/client/locales
 */

export const NS = 'context-lens' as const

/** Chinese product copy (primary). */
export const zh = {
  'view.context': '请求上下文',
  'overview.title': '概览',
  'overview.requests': '请求 {count}',
  'overview.cacheDrops': '缓存回落 {count}',
  'overview.structuralChanges': '结构变化 {count}',
  'list.title': '最近请求',
  'list.empty': '还没有 LLM 请求。发送一条消息后这里会出现每次请求的结构变化与缓存复用情况。',
  'list.cache': '缓存 {percent}%',
  'list.cache.drop': '缓存回落',
  'list.cache.unavailable': '用量 n/a',
  'list.changed': '有变化',
  'list.status.completed': '完成',
  'list.status.failed': '失败',
  'list.status.aborted': '中止',
  'inspector.usage': '用量',
  'inspector.input': '输入(未缓存)',
  'inspector.cacheRead': '缓存读取',
  'inspector.cacheWrite': '缓存写入',
  'inspector.output': '输出',
  'inspector.reasoning': '推理',
  'inspector.unavailable': 'unavailable',
  'inspector.cacheReuse': '缓存复用',
  'inspector.surface': '估算表面',
  'inspector.header': '请求头部',
  'inspector.configHash': '配置',
  'inspector.systemHash': '系统提示',
  'inspector.tools': '工具 {count}',
  'inspector.model': '模型',
  'inspector.contextWindow': '上下文窗口',
  'inspector.diff.title': '与上次请求的差异',
  'inspector.diff.none': '无结构变化',
  'inspector.diff.model': '模型 {before} → {after}',
  'inspector.diff.provider': '服务商 {before} → {after}',
  'inspector.diff.config': '请求配置变化',
  'inspector.diff.system': '系统提示变化',
  'inspector.diff.tools': '工具 +{added} −{removed} ~{modified}',
  'inspector.diff.tools.order': '工具顺序变化',
  'inspector.diff.tools.orderHint': '结构与模式未变，但声明顺序改变，可能影响 provider 序列化与前缀缓存。',
  'inspector.diff.surface': '估算表面 +{delta} tokens',
  'inspector.diff.cache': '缓存复用 {before}% → {after}% ({delta} 个百分点)',
  'inspector.likely.title': '同时发生的变化',
  'inspector.likely.hint': '仅相关，不构成因果。',
  'inspector.drop.banner': '缓存复用较上次请求回落 {delta} 个百分点',
  'cause.model-or-provider-changed': '模型或服务商变化',
  'cause.system-changed': '系统提示变化',
  'cause.tools-changed': '工具集变化',
  'cause.config-changed': '请求配置变化',
  'cause.surface-grew': '对话表面增长',
  'cause.no-obvious-change': '无明显的请求变化',
  'empty.title': '暂无数据',
  'empty.hint': 'Context Lens 会在 LLM 请求开始流动后自动观察。',
} as const

/** English product copy (secondary). */
export const en: Record<keyof typeof zh, string> = {
  'view.context': 'Request Context',
  'overview.title': 'Overview',
  'overview.requests': 'Requests {count}',
  'overview.cacheDrops': 'Cache drops {count}',
  'overview.structuralChanges': 'Structural changes {count}',
  'list.title': 'Recent requests',
  'list.empty': 'No LLM requests yet. Send a message and each request\'s structural changes and cache reuse will appear here.',
  'list.cache': 'cache {percent}%',
  'list.cache.drop': 'cache drop',
  'list.cache.unavailable': 'usage n/a',
  'list.changed': 'changed',
  'list.status.completed': 'completed',
  'list.status.failed': 'failed',
  'list.status.aborted': 'aborted',
  'inspector.usage': 'Usage',
  'inspector.input': 'Input (uncached)',
  'inspector.cacheRead': 'Cache read',
  'inspector.cacheWrite': 'Cache write',
  'inspector.output': 'Output',
  'inspector.reasoning': 'Reasoning',
  'inspector.unavailable': 'unavailable',
  'inspector.cacheReuse': 'Cache reuse',
  'inspector.surface': 'Est. surface',
  'inspector.header': 'Request header',
  'inspector.configHash': 'Config',
  'inspector.systemHash': 'System prompt',
  'inspector.tools': 'Tools {count}',
  'inspector.model': 'Model',
  'inspector.contextWindow': 'Context window',
  'inspector.diff.title': 'Changes vs previous request',
  'inspector.diff.none': 'No structural changes',
  'inspector.diff.model': 'Model {before} → {after}',
  'inspector.diff.provider': 'Provider {before} → {after}',
  'inspector.diff.config': 'Request config changed',
  'inspector.diff.system': 'System prompt changed',
  'inspector.diff.tools': 'Tools +{added} −{removed} ~{modified}',
  'inspector.diff.tools.order': 'Tool order changed',
  'inspector.diff.tools.orderHint': 'Set and schemas unchanged, but declaration order changed — this can affect provider serialization and the prefix cache.',
  'inspector.diff.surface': 'Est. surface +{delta} tokens',
  'inspector.diff.cache': 'Cache reuse {before}% → {after}% ({delta} pts)',
  'inspector.likely.title': 'Coincident changes',
  'inspector.likely.hint': 'Correlation only — not causation.',
  'inspector.drop.banner': 'Cache reuse dropped {delta} pts vs previous request',
  'cause.model-or-provider-changed': 'Model or provider changed',
  'cause.system-changed': 'System prompt changed',
  'cause.tools-changed': 'Tool set changed',
  'cause.config-changed': 'Request config changed',
  'cause.surface-grew': 'Conversation surface grew',
  'cause.no-obvious-change': 'No obvious request change',
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
