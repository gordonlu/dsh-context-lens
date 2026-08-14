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
export declare const NS: "context-lens";
/** Chinese product copy (primary). */
export declare const zh: {
    readonly 'view.context': "请求上下文";
    readonly 'overview.requests': "{count} 次请求";
    readonly 'overview.cacheStable': "缓存稳定";
    readonly 'overview.cacheDrops': "{count} 次缓存回落";
    readonly 'overview.structureStable': "结构稳定";
    readonly 'overview.structureChanges': "{count} 次结构变化";
    readonly 'overview.health': "会话健康度";
    readonly 'overview.requestCount': "请求数";
    readonly 'overview.hitRate': "缓存命中率";
    readonly 'overview.structure': "结构变化";
    readonly 'overview.dropCount': "缓存回落";
    readonly 'overview.none': "未发生";
    readonly 'overview.needsAttention': "需要关注";
    readonly 'overview.recovered': "近 {count} 个请求无回落";
    readonly 'list.title': "最近请求";
    readonly 'list.empty': "还没有 LLM 请求。发送一条消息后这里会出现每次请求的变化与缓存复用情况。";
    readonly 'list.filtered.empty': "最近请求均无值得关注的变化。取消勾选过滤可查看全部。";
    readonly 'list.hideUnchanged': "隐藏无变化请求";
    readonly 'list.hideSurface': "隐藏仅上下文增长";
    readonly 'list.cache': "缓存 {percent}%";
    readonly 'list.cache.drop': "缓存回落";
    readonly 'list.cache.unavailable': "用量 n/a";
    readonly 'list.tag.stable': "稳定";
    readonly 'list.tag.drop': "缓存回落";
    readonly 'list.tag.tools': "工具变化";
    readonly 'list.tag.system': "系统变化";
    readonly 'list.tag.config': "配置变化";
    readonly 'list.tag.model': "模型变化";
    readonly 'list.tag.provider': "服务商变化";
    readonly 'list.tag.surface': "+{delta} tok";
    readonly 'list.status.completed': "完成";
    readonly 'list.status.failed': "失败";
    readonly 'list.status.aborted': "中止";
    readonly 'inspector.cacheReuse': "缓存复用";
    readonly 'inspector.newInput': "新增输入";
    readonly 'inspector.contextSurface': "估算请求上下文";
    readonly 'inspector.cacheImpact': "缓存影响";
    readonly 'inspector.request': "请求 #{ordinal}";
    readonly 'inspector.deltaUp': "↑{delta} 个百分点";
    readonly 'inspector.deltaDown': "↓{delta} 个百分点";
    readonly 'inspector.unavailable': "-";
    readonly 'inspector.compare': "对比 {prev}";
    readonly 'inspector.noChange': "无变化";
    readonly 'inspector.changed': "有变化";
    readonly 'inspector.compare.system': "系统提示";
    readonly 'inspector.compare.tools': "工具";
    readonly 'inspector.compare.toolsDetail': "无变化 · {count} 个工具";
    readonly 'inspector.compare.toolsChanged': "{before} → {after}";
    readonly 'inspector.compare.order': "工具顺序";
    readonly 'inspector.compare.config': "配置";
    readonly 'inspector.compare.model': "模型";
    readonly 'inspector.compare.provider': "服务商";
    readonly 'inspector.compare.surface': "上下文";
    readonly 'inspector.compare.surfaceDelta': "+{delta} tok";
    readonly 'inspector.diff.tools': "工具 +{added} −{removed} ~{modified}";
    readonly 'inspector.diff.tools.orderHint': "结构与模式未变，但声明顺序改变，可能影响 provider 序列化与前缀缓存。";
    readonly 'inspector.likely.title': "同时发生的变化";
    readonly 'inspector.likely.hint': "仅相关，不构成因果。";
    readonly 'inspector.conclusion.ok': "未检测到影响缓存的请求变化。";
    readonly 'inspector.conclusion.detail': "当前请求结构保持稳定，缓存性能未见结构性风险。";
    readonly 'inspector.drop.banner': "缓存复用较上次请求回落 {delta} 个百分点";
    readonly 'cause.model-or-provider-changed': "模型或服务商变化";
    readonly 'cause.system-changed': "系统提示变化";
    readonly 'cause.tools-changed': "工具集变化";
    readonly 'cause.config-changed': "请求配置变化";
    readonly 'cause.surface-grew': "对话表面增长";
    readonly 'cause.no-obvious-change': "无明显的请求变化";
    readonly 'inspector.tech.show': "查看技术细节";
    readonly 'inspector.tech.hide': "收起技术细节";
    readonly 'inspector.usage': "用量";
    readonly 'inspector.input': "输入(未缓存)";
    readonly 'inspector.cacheRead': "缓存读取";
    readonly 'inspector.cacheWrite': "缓存写入";
    readonly 'inspector.output': "输出";
    readonly 'inspector.reasoning': "推理";
    readonly 'inspector.surface': "估算请求上下文";
    readonly 'inspector.header': "请求头部";
    readonly 'inspector.configHash': "配置";
    readonly 'inspector.systemHash': "系统提示";
    readonly 'inspector.tools': "工具 {count}";
    readonly 'inspector.tools.show': "查看全部 {count} 个工具";
    readonly 'inspector.tools.hide': "收起工具列表";
    readonly 'inspector.contextWindow': "上下文窗口";
    readonly 'empty.title': "暂无数据";
    readonly 'empty.hint': "Context Lens 会在 LLM 请求开始流动后自动观察。";
};
/** English product copy (secondary). */
export declare const en: Record<keyof typeof zh, string>;
/** Union of every copy key in this namespace. */
export type ContextLensKey = keyof typeof zh;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The Context Lens view's copy. */
        'context-lens': ContextLensKey;
    }
}
