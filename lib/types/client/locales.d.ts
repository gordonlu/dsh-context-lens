/**
 * dsh-context-lens client dictionaries and the `context-lens` locale
 * namespace. `ContextLensKey` is the union of every copy key; it is declared
 * into the framework's merge-extensible `LocaleNamespaceMap`, which types the
 * `t` seat on the view component props.
 *
 * @module dsh-context-lens/client/locales
 */
export declare const NS: "context-lens";
/** Chinese product copy (primary). */
export declare const zh: {
    readonly 'view.context': "请求上下文";
    readonly 'overview.title': "概览";
    readonly 'overview.requests': "请求";
    readonly 'overview.cacheDrops': "缓存回落";
    readonly 'overview.structuralChanges': "结构变化";
    readonly 'list.title': "最近请求";
    readonly 'list.empty': "还没有 LLM 请求。发送一条消息后这里会出现每次请求的结构变化与缓存复用情况。";
    readonly 'list.cache': "缓存 {percent}%";
    readonly 'list.cache.drop': "缓存回落";
    readonly 'list.cache.unavailable': "用量 n/a";
    readonly 'list.changed': "有变化";
    readonly 'list.status.completed': "完成";
    readonly 'list.status.failed': "失败";
    readonly 'list.status.aborted': "中止";
    readonly 'inspector.usage': "用量";
    readonly 'inspector.input': "输入(未缓存)";
    readonly 'inspector.cacheRead': "缓存读取";
    readonly 'inspector.cacheWrite': "缓存写入";
    readonly 'inspector.output': "输出";
    readonly 'inspector.reasoning': "推理";
    readonly 'inspector.unavailable': "unavailable";
    readonly 'inspector.cacheReuse': "缓存复用";
    readonly 'inspector.surface': "估算表面";
    readonly 'inspector.header': "请求头部";
    readonly 'inspector.configHash': "配置";
    readonly 'inspector.systemHash': "系统提示";
    readonly 'inspector.tools': "工具 {count}";
    readonly 'inspector.tools.show': "工具明细 {count}";
    readonly 'inspector.tools.hide': "收起工具明细";
    readonly 'inspector.model': "模型";
    readonly 'inspector.contextWindow': "上下文窗口";
    readonly 'inspector.diff.title': "与上次请求的差异";
    readonly 'inspector.diff.none': "无结构变化";
    readonly 'inspector.diff.model': "模型 {before} → {after}";
    readonly 'inspector.diff.provider': "服务商 {before} → {after}";
    readonly 'inspector.diff.config': "请求配置变化";
    readonly 'inspector.diff.system': "系统提示变化";
    readonly 'inspector.diff.tools': "工具 +{added} −{removed} ~{modified}";
    readonly 'inspector.diff.tools.order': "工具顺序变化";
    readonly 'inspector.diff.tools.orderHint': "结构与模式未变，但声明顺序改变，可能影响 provider 序列化与前缀缓存。";
    readonly 'inspector.diff.surface': "估算表面 +{delta} tokens";
    readonly 'inspector.diff.cache': "缓存复用 {before}% → {after}% ({delta} 个百分点)";
    readonly 'inspector.likely.title': "同时发生的变化";
    readonly 'inspector.likely.hint': "仅相关，不构成因果。";
    readonly 'inspector.drop.banner': "缓存复用较上次请求回落 {delta} 个百分点";
    readonly 'cause.model-or-provider-changed': "模型或服务商变化";
    readonly 'cause.system-changed': "系统提示变化";
    readonly 'cause.tools-changed': "工具集变化";
    readonly 'cause.config-changed': "请求配置变化";
    readonly 'cause.surface-grew': "对话表面增长";
    readonly 'cause.no-obvious-change': "无明显的请求变化";
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
