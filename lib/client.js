window.__ModuleLoader__.load({
	id: "dsh-context-lens",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/format.ts
		/**
		* Pure display helpers for the Context Lens view. All functions are
		* deterministic; the component tree renders their outputs directly.
		*
		* @module dsh-context-lens/client/format
		*/
		/**
		* Format a ratio in [0, 1] as a whole-number percentage string WITHOUT the
		* percent sign — locale templates own the `%` glyph (`'缓存 {percent}%'`),
		* so a sign here would render `100%%`.
		* @param ratio - the ratio.
		* @returns e.g. `"83"`.
		*/
		function formatPercent(ratio) {
			return `${Math.round(ratio * 100)}`;
		}
		/**
		* Format a token count with a compact suffix.
		* @param tokens - the token count.
		* @returns e.g. `"12.4k"` or `"800"`.
		*/
		function formatTokens(tokens) {
			if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(1)}M`;
			if (tokens >= 1e3) return `${(tokens / 1e3).toFixed(1)}k`;
			return String(tokens);
		}
		/**
		* Shorten a hex fingerprint hash for inline display.
		* @param hash - the full hash.
		* @returns the first 8 characters.
		*/
		function shortHash(hash) {
			return hash.length > 8 ? hash.slice(0, 8) : hash;
		}
		/**
		* One-line summary of a request relative to its predecessor: status wins,
		* then a cache drop, then structural changes (in diff rule order), then
		* significant surface growth; everything else is stable.
		* @param request - the request record.
		* @param t - the bound translate.
		* @returns the tag.
		*/
		function requestTag(request, t) {
			if (request.status !== "completed") {
				const key = `list.status.${request.status}`;
				return {
					kind: request.status,
					key,
					text: t(key),
					alarming: true
				};
			}
			const diff = request.diffFromPrevious;
			if (request.cache?.drop === true) return {
				kind: "drop",
				key: "list.tag.drop",
				text: t("list.tag.drop"),
				alarming: true
			};
			if (diff !== void 0) {
				if (diff.tools.changed) return {
					kind: "tools",
					key: "list.tag.tools",
					text: t("list.tag.tools"),
					alarming: true
				};
				if (diff.system.changed) return {
					kind: "system",
					key: "list.tag.system",
					text: t("list.tag.system"),
					alarming: true
				};
				if (diff.configChanged) return {
					kind: "config",
					key: "list.tag.config",
					text: t("list.tag.config"),
					alarming: true
				};
				if (diff.modelChanged) return {
					kind: "model",
					key: "list.tag.model",
					text: t("list.tag.model"),
					alarming: true
				};
				if (diff.providerChanged) return {
					kind: "provider",
					key: "list.tag.provider",
					text: t("list.tag.provider"),
					alarming: true
				};
				if (diff.surface.estimatedDeltaTokens !== void 0 && diff.surface.estimatedDeltaTokens >= 1024) return {
					kind: "surface",
					key: "list.tag.surface",
					text: t("list.tag.surface", { delta: formatTokens(diff.surface.estimatedDeltaTokens) }),
					alarming: false
				};
			}
			return {
				kind: "stable",
				key: "list.tag.stable",
				text: t("list.tag.stable"),
				alarming: false
			};
		}
		/**
		* The session-global ordinal of a request: the newest retained request is
		* `totalRequests` (the cumulative counter survives window trimming), so the
		* ordinal of window index `i` (0-based, newest last) is
		* `totalRequests - (length - 1 - i)`.
		* @param index - window index (0 = oldest retained).
		* @param length - retained window length.
		* @param totalRequests - cumulative request counter.
		* @returns the 1-based session ordinal.
		*/
		function globalOrdinal(index, length, totalRequests) {
			return totalRequests - (length - 1 - index);
		}
		/**
		* Whether a request differs structurally from its predecessor (used by the
		* hide-unchanged filter; surface-only growth does not count).
		* @param request - the request record.
		* @returns true when tools/system/config/model/provider changed or the cache dropped.
		*/
		function structurallyChanged(request) {
			if (request.cache?.drop === true) return true;
			const diff = request.diffFromPrevious;
			return diff !== void 0 && (diff.tools.changed || diff.system.changed || diff.configChanged || diff.modelChanged || diff.providerChanged);
		}
		/**
		* Whether a request is "unchanged" for the list filter. The definition must
		* match the tag computation exactly: a stable tag is hideable; ANY other tag
		* — including significant surface growth — is interesting. A request with a
		* +17.6K context jump but no structural change must NOT vanish under the
		* default filter; the whole point of the lens is surfacing it.
		*/
		function isUnchanged(request) {
			if (request.status !== "completed") return false;
			if (structurallyChanged(request)) return false;
			const delta = request.diffFromPrevious?.surface.estimatedDeltaTokens;
			return delta === void 0 || delta < 1024;
		}
		//#endregion
		//#region src/client/locales.ts
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
		const NS = "context-lens";
		/** Chinese product copy (primary). */
		const zh = {
			"view.context": "请求上下文",
			"overview.requests": "{count} 次请求",
			"overview.cacheStable": "缓存稳定",
			"overview.cacheDrops": "{count} 次缓存回落",
			"overview.structureStable": "结构稳定",
			"overview.structureChanges": "{count} 次结构变化",
			"overview.health": "会话健康度",
			"overview.requestCount": "请求数",
			"overview.hitRate": "缓存命中率",
			"overview.structure": "结构变化",
			"overview.dropCount": "缓存回落",
			"overview.none": "未发生",
			"overview.needsAttention": "需要关注",
			"list.title": "最近请求",
			"list.empty": "还没有 LLM 请求。发送一条消息后这里会出现每次请求的变化与缓存复用情况。",
			"list.filtered.empty": "最近请求均无变化。取消“隐藏无变化请求”可查看全部。",
			"list.hideUnchanged": "隐藏无变化请求",
			"list.cache": "缓存 {percent}%",
			"list.cache.drop": "缓存回落",
			"list.cache.unavailable": "用量 n/a",
			"list.tag.stable": "稳定",
			"list.tag.drop": "缓存回落",
			"list.tag.tools": "工具变化",
			"list.tag.system": "系统变化",
			"list.tag.config": "配置变化",
			"list.tag.model": "模型变化",
			"list.tag.provider": "服务商变化",
			"list.tag.surface": "+{delta} tok",
			"list.status.completed": "完成",
			"list.status.failed": "失败",
			"list.status.aborted": "中止",
			"inspector.cacheReuse": "缓存复用",
			"inspector.newInput": "新增输入",
			"inspector.contextSurface": "估算请求上下文",
			"inspector.cacheImpact": "缓存影响",
			"inspector.request": "请求 #{ordinal}",
			"inspector.deltaUp": "↑{delta} 个百分点",
			"inspector.deltaDown": "↓{delta} 个百分点",
			"inspector.unavailable": "-",
			"inspector.compare": "对比 {prev}",
			"inspector.noChange": "无变化",
			"inspector.changed": "有变化",
			"inspector.compare.system": "系统提示",
			"inspector.compare.tools": "工具",
			"inspector.compare.toolsDetail": "无变化 · {count} 个工具",
			"inspector.compare.toolsChanged": "{before} → {after}",
			"inspector.compare.order": "工具顺序",
			"inspector.compare.config": "配置",
			"inspector.compare.model": "模型",
			"inspector.compare.provider": "服务商",
			"inspector.compare.surface": "上下文",
			"inspector.compare.surfaceDelta": "+{delta} tok",
			"inspector.diff.tools": "工具 +{added} −{removed} ~{modified}",
			"inspector.diff.tools.orderHint": "结构与模式未变，但声明顺序改变，可能影响 provider 序列化与前缀缓存。",
			"inspector.likely.title": "同时发生的变化",
			"inspector.likely.hint": "仅相关，不构成因果。",
			"inspector.conclusion.ok": "未检测到影响缓存的请求变化。",
			"inspector.conclusion.detail": "当前请求结构保持稳定，缓存性能未见结构性风险。",
			"inspector.drop.banner": "缓存复用较上次请求回落 {delta} 个百分点",
			"cause.model-or-provider-changed": "模型或服务商变化",
			"cause.system-changed": "系统提示变化",
			"cause.tools-changed": "工具集变化",
			"cause.config-changed": "请求配置变化",
			"cause.surface-grew": "对话表面增长",
			"cause.no-obvious-change": "无明显的请求变化",
			"inspector.tech.show": "查看技术细节",
			"inspector.tech.hide": "收起技术细节",
			"inspector.usage": "用量",
			"inspector.input": "输入(未缓存)",
			"inspector.cacheRead": "缓存读取",
			"inspector.cacheWrite": "缓存写入",
			"inspector.output": "输出",
			"inspector.reasoning": "推理",
			"inspector.surface": "估算请求上下文",
			"inspector.header": "请求头部",
			"inspector.configHash": "配置",
			"inspector.systemHash": "系统提示",
			"inspector.tools": "工具 {count}",
			"inspector.tools.show": "查看全部 {count} 个工具",
			"inspector.tools.hide": "收起工具列表",
			"inspector.contextWindow": "上下文窗口",
			"empty.title": "暂无数据",
			"empty.hint": "Context Lens 会在 LLM 请求开始流动后自动观察。"
		};
		/** English product copy (secondary). */
		const en = {
			"view.context": "Request Context",
			"overview.requests": "{count} requests",
			"overview.cacheStable": "Cache stable",
			"overview.cacheDrops": "{count} cache drops",
			"overview.structureStable": "Structure stable",
			"overview.structureChanges": "{count} structural changes",
			"overview.health": "Session health",
			"overview.requestCount": "Requests",
			"overview.hitRate": "Cache hit rate",
			"overview.structure": "Structure changes",
			"overview.dropCount": "Cache drops",
			"overview.none": "None",
			"overview.needsAttention": "Needs attention",
			"list.title": "Recent requests",
			"list.empty": "No LLM requests yet. Send a message and each request's changes and cache reuse will appear here.",
			"list.filtered.empty": "All recent requests are unchanged. Untick “Hide unchanged requests” to see them.",
			"list.hideUnchanged": "Hide unchanged requests",
			"list.cache": "cache {percent}%",
			"list.cache.drop": "cache drop",
			"list.cache.unavailable": "usage n/a",
			"list.tag.stable": "Stable",
			"list.tag.drop": "Cache drop",
			"list.tag.tools": "Tools changed",
			"list.tag.system": "System changed",
			"list.tag.config": "Config changed",
			"list.tag.model": "Model changed",
			"list.tag.provider": "Provider changed",
			"list.tag.surface": "+{delta} tok",
			"list.status.completed": "completed",
			"list.status.failed": "failed",
			"list.status.aborted": "aborted",
			"inspector.cacheReuse": "Cache reuse",
			"inspector.newInput": "New input",
			"inspector.contextSurface": "Context surface",
			"inspector.cacheImpact": "Cache impact",
			"inspector.request": "Request #{ordinal}",
			"inspector.deltaUp": "↑{delta} pts",
			"inspector.deltaDown": "↓{delta} pts",
			"inspector.unavailable": "-",
			"inspector.compare": "vs {prev}",
			"inspector.noChange": "No change",
			"inspector.changed": "Changed",
			"inspector.compare.system": "System prompt",
			"inspector.compare.tools": "Tools",
			"inspector.compare.toolsDetail": "No change · {count} tools",
			"inspector.compare.toolsChanged": "{before} → {after}",
			"inspector.compare.order": "Tool order",
			"inspector.compare.config": "Config",
			"inspector.compare.model": "Model",
			"inspector.compare.provider": "Provider",
			"inspector.compare.surface": "Context",
			"inspector.compare.surfaceDelta": "+{delta} tok",
			"inspector.diff.tools": "Tools +{added} −{removed} ~{modified}",
			"inspector.diff.tools.orderHint": "Set and schemas unchanged, but declaration order changed — this can affect provider serialization and the prefix cache.",
			"inspector.likely.title": "Coincident changes",
			"inspector.likely.hint": "Correlation only — not causation.",
			"inspector.conclusion.ok": "No cache-impacting request changes detected.",
			"inspector.conclusion.detail": "Request structure remains stable with no structural risk to cache performance.",
			"inspector.drop.banner": "Cache reuse dropped {delta} pts vs previous request",
			"cause.model-or-provider-changed": "Model or provider changed",
			"cause.system-changed": "System prompt changed",
			"cause.tools-changed": "Tool set changed",
			"cause.config-changed": "Request config changed",
			"cause.surface-grew": "Conversation surface grew",
			"cause.no-obvious-change": "No obvious request change",
			"inspector.tech.show": "Show technical details",
			"inspector.tech.hide": "Hide technical details",
			"inspector.usage": "Usage",
			"inspector.input": "Input (uncached)",
			"inspector.cacheRead": "Cache read",
			"inspector.cacheWrite": "Cache write",
			"inspector.output": "Output",
			"inspector.reasoning": "Reasoning",
			"inspector.surface": "Context surface",
			"inspector.header": "Request header",
			"inspector.configHash": "Config",
			"inspector.systemHash": "System prompt",
			"inspector.tools": "Tools {count}",
			"inspector.tools.show": "View all {count} tools",
			"inspector.tools.hide": "Hide tool list",
			"inspector.contextWindow": "Context window",
			"empty.title": "No data yet",
			"empty.hint": "Context Lens observes LLM requests once they start flowing."
		};
		//#endregion
		//#region \0dsh-css:/data/code/dsh-context-lens/src/client/context-lens.module.css.mjs
		const css = ".baafcW_root{--lens-blue:var(--dsw-static-blue-600,#4169e8);--lens-blue-soft:var(--dsw-alias-interactive-bg-hover,#4169e812);--lens-green:var(--dsw-static-green-700,#159447);--lens-red:var(--dsw-static-red-600,#d83a45);--lens-border:color-mix(in srgb, var(--dsw-alias-label-caption,#70809a) 20%, transparent);--lens-surface:var(--dsw-alias-bg-base,#ffffffc2);--lens-surface-raised:var(--dsw-alias-bg-raised,#ffffffeb);--lens-muted:var(--dsw-alias-label-caption,#70809a);box-sizing:border-box;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#17213a);background:var(--dsw-alias-bg-base,#f8faff);flex-direction:column;gap:16px;padding:18px;font-size:13px;line-height:1.45;display:flex;overflow:hidden}.baafcW_overview{flex:none;min-width:0}.baafcW_statusChips{grid-template-columns:minmax(170px,1.25fr) repeat(4,minmax(110px,.82fr));gap:10px;display:grid}.baafcW_overviewCard{box-sizing:border-box;border:1px solid var(--lens-border);background:var(--lens-surface-raised);border-radius:12px;grid-template-columns:28px minmax(0,1fr);align-content:center;gap:2px 8px;min-width:0;min-height:66px;padding:10px 13px;display:grid;box-shadow:0 8px 24px #1f31520b}.baafcW_overviewCardOk{border-color:color-mix(in srgb, var(--lens-green) 18%, transparent);background:var(--dsw-alias-interactive-bg-hover-success,#1eae5a11)}.baafcW_overviewCardBad{border-color:color-mix(in srgb, var(--lens-red) 20%, transparent)}.baafcW_overviewIcon{background:color-mix(in srgb, var(--lens-blue) 10%, transparent);width:26px;height:26px;color:var(--lens-blue);border-radius:8px;grid-row:1;justify-content:center;align-items:center;display:inline-flex}.baafcW_overviewIcon svg{width:16px;height:16px}.baafcW_overviewCardOk .baafcW_overviewIcon{background:var(--lens-green);color:#fff;border-radius:50%}.baafcW_overviewCardBad .baafcW_overviewIcon{background:color-mix(in srgb, var(--lens-red) 10%, transparent);color:var(--lens-red)}.baafcW_overviewCardBody{flex-direction:column;gap:2px;min-width:0;display:flex}.baafcW_overviewLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--lens-muted);font-size:10px;font-weight:560;overflow:hidden}.baafcW_overviewReading{align-items:baseline;gap:7px;min-width:0;display:flex}.baafcW_overviewReading strong{color:var(--dsw-alias-label-primary,#17213a);font-variant-numeric:tabular-nums;flex:none;font-size:16px;font-weight:740;line-height:1.15}.baafcW_overviewCardOk .baafcW_overviewReading strong{color:var(--lens-green);font-size:12px}.baafcW_overviewCardBad .baafcW_overviewReading strong{color:var(--lens-red)}.baafcW_overviewReading small{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--lens-muted);font-size:8px;overflow:hidden}.baafcW_banner{border:1px solid color-mix(in srgb, var(--lens-red) 26%, transparent);background:var(--dsw-alias-interactive-bg-hover-danger,#d83a4512);color:var(--lens-red);border-radius:10px;padding:10px 14px;font-size:12px;font-weight:600}.baafcW_layout{flex:1;grid-template-columns:minmax(250px,300px) minmax(0,1fr);gap:18px;min-height:0;display:grid}.baafcW_list{box-sizing:border-box;border:1px solid var(--lens-border);min-width:0;color:var(--lens-muted);background:var(--lens-surface);scrollbar-width:thin;scrollbar-color:var(--lens-border) transparent;border-radius:14px;flex-direction:column;gap:8px;padding:12px;display:flex;overflow-y:auto;box-shadow:0 12px 32px #1f31520b}.baafcW_listToolbar{box-sizing:border-box;border:1px solid var(--lens-border);background:var(--lens-surface-raised);min-height:38px;color:var(--dsw-alias-label-primary,#17213a);cursor:pointer;user-select:none;border-radius:9px;flex:none;align-items:center;gap:8px;padding:0 10px;font-size:12px;font-weight:550;display:inline-flex}.baafcW_listHeader{justify-content:space-between;align-items:center;min-height:28px;padding:0 3px;display:flex}.baafcW_listTitle{color:var(--dsw-alias-label-primary,#17213a);align-items:center;gap:7px;font-size:13px;font-weight:720;display:inline-flex}.baafcW_listTitle svg{width:15px;height:15px;color:var(--lens-blue)}.baafcW_listCount{box-sizing:border-box;background:var(--lens-blue-soft);min-width:24px;color:var(--lens-blue);text-align:center;font-variant-numeric:tabular-nums;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:700}.baafcW_listToolbar:hover{border-color:color-mix(in srgb, var(--lens-blue) 35%, transparent);background:var(--lens-blue-soft)}.baafcW_listToolbar input{width:15px;height:15px;accent-color:var(--lens-blue);margin:0}.baafcW_listEmpty{border:1px dashed var(--lens-border);text-align:center;color:var(--lens-muted);border-radius:10px;padding:28px 12px;font-size:12px}.baafcW_listItem{box-sizing:border-box;border:1px solid #0000;border-bottom-color:var(--lens-border);min-height:74px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border-radius:11px;flex-direction:column;align-items:stretch;gap:9px;padding:11px 12px;transition:background-color .14s,border-color .14s,box-shadow .14s,transform .14s;display:flex}.baafcW_listItem:hover{border-color:var(--lens-border);background:var(--lens-blue-soft);transform:translateY(-1px)}.baafcW_listItemSelected{border-color:color-mix(in srgb, var(--lens-blue) 38%, transparent);background:color-mix(in srgb, var(--lens-blue) 8%, var(--lens-surface-raised));box-shadow:0 8px 22px #4169e81a}.baafcW_seq{font-family:var(--ds-font-family-code,\"SF Mono\", Consolas, monospace);color:var(--dsw-alias-label-primary,#17213a);font-variant-numeric:tabular-nums;flex:none;min-width:0;font-size:12px;font-weight:700}.baafcW_listItemHead{grid-template-columns:18px auto minmax(0,1fr) auto;align-items:center;gap:8px;display:grid}.baafcW_timelineIcon{width:17px;height:17px;color:var(--lens-green);display:inline-flex}.baafcW_timelineIcon svg{width:17px;height:17px}.baafcW_timelineIconAlarm{color:var(--lens-red)}.baafcW_itemTag{text-overflow:ellipsis;white-space:nowrap;background:var(--dsw-alias-interactive-bg-hover-success,#1eae5a17);max-width:100%;color:var(--lens-green);border-radius:999px;justify-self:start;padding:3px 9px;font-size:11px;font-weight:650;overflow:hidden}.baafcW_itemTagAlarm{color:var(--lens-red);background:var(--dsw-alias-interactive-bg-hover-danger,#d83a4514)}.baafcW_cacheCell{font-variant-numeric:tabular-nums;color:var(--lens-muted);font-size:11px;font-weight:600}.baafcW_itemTime{color:var(--lens-muted);font-variant-numeric:tabular-nums;font-size:9px}.baafcW_itemMetrics{color:var(--dsw-alias-label-primary,#17213a);font-variant-numeric:tabular-nums;grid-template-columns:.8fr 1fr auto;align-items:center;gap:7px;font-size:10px;display:grid}.baafcW_cacheCellDrop{color:var(--lens-red)}.baafcW_inspector{min-width:0;color:var(--lens-muted);scrollbar-width:thin;scrollbar-color:var(--lens-border) transparent;flex-direction:column;gap:14px;padding-right:3px;display:flex;overflow-y:auto}.baafcW_inspectorHead{justify-content:space-between;align-items:center;gap:10px;min-height:42px;padding:0 2px;display:flex}.baafcW_requestTitleGroup,.baafcW_requestIdentity{align-items:center;gap:9px;min-width:0;display:flex}.baafcW_requestTitle{color:var(--dsw-alias-label-primary,#17213a);font-size:17px;font-weight:740}.baafcW_requestIcon{background:color-mix(in srgb, var(--lens-blue) 10%, transparent);width:28px;height:28px;color:var(--lens-blue);border-radius:8px;justify-content:center;align-items:center;display:inline-flex}.baafcW_requestIcon svg{width:17px;height:17px}.baafcW_requestTime{color:var(--lens-muted);font-variant-numeric:tabular-nums;font-size:10px}.baafcW_modelBadge,.baafcW_providerBadge{text-overflow:ellipsis;white-space:nowrap;border:1px solid var(--lens-border);background:var(--lens-surface-raised);max-width:190px;color:var(--dsw-alias-label-primary,#17213a);border-radius:9px;padding:7px 11px;font-size:10px;font-weight:620;overflow:hidden}.baafcW_providerBadge{color:var(--lens-muted)}.baafcW_statusPill{border-radius:999px;padding:5px 10px;font-size:11px;font-weight:650;line-height:1}.baafcW_statusPillOk{color:var(--lens-green);background:var(--dsw-alias-interactive-bg-hover-success,#1eae5a17)}.baafcW_statusPillAlarm{color:var(--lens-red);background:var(--dsw-alias-interactive-bg-hover-danger,#d83a4514)}.baafcW_panel{border:1px solid var(--lens-border);background:var(--lens-surface-raised);border-radius:14px;flex-direction:column;gap:0;padding:14px 18px;display:flex;box-shadow:0 12px 32px #1f31520b}.baafcW_inspectorHead+.baafcW_panel{background:radial-gradient(circle at 10% 20%, #4696ff1a, transparent 30%), radial-gradient(circle at 92% 35%, #965aff1a, transparent 35%), linear-gradient(110deg, var(--lens-surface-raised) 0%, color-mix(in srgb, var(--lens-blue) 2%, var(--lens-surface-raised)) 45%, color-mix(in srgb, #9560ff 3%, var(--lens-surface-raised)) 100%);border-color:color-mix(in srgb, var(--lens-blue) 20%, var(--lens-border));position:relative;overflow:hidden}.baafcW_inspectorHead+.baafcW_panel:after{content:\"\";pointer-events:none;background-image:radial-gradient(circle,#785aff21 1.3px,#0000 1.4px);background-size:16px 16px;width:220px;height:220px;position:absolute;top:-32px;right:-42px;mask-image:radial-gradient(circle,#000,#0000 70%)}.baafcW_inspectorHead+.baafcW_panel .baafcW_stats{z-index:1;grid-template-columns:repeat(4,minmax(0,1fr));position:relative}.baafcW_panelTitle{color:var(--dsw-alias-label-primary,#17213a);align-items:center;gap:8px;margin-bottom:10px;font-size:13px;font-weight:680;display:flex}.baafcW_stats{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;display:grid}.baafcW_stat{flex-direction:column;gap:8px;min-width:0;padding:6px 18px 6px 0;display:flex}.baafcW_stat+.baafcW_stat{border-left:1px solid var(--lens-border);padding-left:18px}.baafcW_statLabel{color:var(--lens-muted);font-size:11px;font-weight:560}.baafcW_statValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#111a30);overflow-wrap:anywhere;font-size:20px;font-weight:720;line-height:1.2}.baafcW_statValueAlarm{color:var(--lens-red)}.baafcW_statAccent .baafcW_statValue{color:var(--lens-blue)}.baafcW_compareRow{border-top:1px solid var(--lens-border);grid-template-columns:minmax(110px,.85fr) minmax(150px,1.15fr);align-items:center;gap:14px;min-height:46px;padding:0 8px;font-size:12px;display:grid}.baafcW_panelTitle+.baafcW_compareRow{border-top:0}.baafcW_compareLabel{min-width:0;color:var(--dsw-alias-label-primary,#17213a);align-items:center;gap:9px;font-weight:610;display:flex}.baafcW_compareMark{background:color-mix(in srgb, var(--lens-blue) 12%, transparent);width:30px;height:30px;box-shadow:inset 3px 0 0 var(--lens-blue);border-radius:8px;flex:none}.baafcW_compareMark svg{width:18px;height:18px;margin:6px}.baafcW_compareRow[data-kind=tools] .baafcW_compareMark,.baafcW_compareRow[data-kind=order] .baafcW_compareMark{background:#7b4ce21c;box-shadow:inset 3px 0 #7b4ce2}.baafcW_compareRow[data-kind=config] .baafcW_compareMark{background:#ef8a241f;box-shadow:inset 3px 0 #ef8a24}.baafcW_compareRow[data-kind=surface] .baafcW_compareMark{background:color-mix(in srgb, var(--lens-green) 12%, transparent);box-shadow:inset 3px 0 0 var(--lens-green)}.baafcW_compareVerdict{min-width:0;color:var(--lens-green);overflow-wrap:anywhere;font-weight:560}.baafcW_compareVerdictChanged{color:var(--lens-red);font-weight:680}.baafcW_compareDetail{border-top:1px dashed var(--lens-border);color:var(--dsw-alias-label-primary,#17213a);margin:-1px 8px 0;padding:8px 0 10px calc(42.5% + 14px);font-size:11px}.baafcW_conclusion{border:1px solid color-mix(in srgb, var(--lens-green) 22%, transparent);background:linear-gradient(90deg, var(--dsw-alias-interactive-bg-hover-success,#1eae5a16), color-mix(in srgb, var(--lens-green) 2.5%, var(--lens-surface-raised)));color:var(--lens-green);border-radius:12px;align-items:center;gap:13px;padding:14px 16px;font-size:12px;font-weight:650;display:flex;position:relative;overflow:hidden;box-shadow:0 8px 24px #1594470d}.baafcW_conclusionMark{background:var(--lens-green);color:#fff;border-radius:50%;flex:none;justify-content:center;align-items:center;width:30px;height:30px;font-size:15px;font-weight:800;display:inline-flex}.baafcW_conclusionMark svg{width:19px;height:19px}.baafcW_conclusion>span{z-index:1;position:relative}.baafcW_conclusionWave{width:min(34%,320px);height:80px;color:var(--lens-green);opacity:.2;pointer-events:none;position:absolute;bottom:-8px;right:-12px}.baafcW_conclusionWave path{stroke:currentColor;stroke-width:1.2px}.baafcW_conclusion strong,.baafcW_conclusion small{display:block}.baafcW_conclusion strong{margin-bottom:2px;font-size:12px}.baafcW_conclusion small{color:var(--lens-muted);font-size:10px;font-weight:500}.baafcW_techFold{border:1px solid var(--lens-border);background:var(--lens-surface);border-radius:12px;flex-direction:column;gap:12px;padding:12px 14px;display:flex}.baafcW_techToggle,.baafcW_toolsToggle{color:var(--dsw-alias-label-primary,#17213a);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:7px;align-self:flex-start;align-items:center;gap:8px;padding:4px 6px;font-size:12px;font-weight:620;display:inline-flex}.baafcW_techToggle:hover,.baafcW_toolsToggle:hover{background:var(--lens-blue-soft);color:var(--lens-blue)}.baafcW_techToggleIcon,.baafcW_toolsToggleIcon{width:12px;color:var(--lens-muted);font-size:10px}.baafcW_techBody{flex-direction:column;gap:12px;display:flex}.baafcW_techBody .baafcW_statValue{font-size:14px;font-weight:650}.baafcW_toolsFold{border-top:1px solid var(--lens-border);flex-direction:column;gap:6px;margin-top:12px;padding-top:10px;display:flex}.baafcW_toolList{flex-direction:column;gap:0;margin-top:4px;display:flex}.baafcW_toolRow{box-sizing:border-box;border-top:1px solid var(--lens-border);grid-template-columns:minmax(120px,1fr) auto auto;align-items:baseline;gap:12px;min-height:32px;padding:5px 6px;font-size:11px;display:grid}.baafcW_toolName{color:var(--dsw-alias-label-primary,#17213a);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.baafcW_causeList{border-top:1px solid var(--lens-border);flex-direction:column;gap:5px;margin-top:8px;padding:12px 8px 4px;display:flex}.baafcW_cause{color:var(--lens-red);font-size:12px;font-weight:600}.baafcW_dim{color:var(--lens-muted);font-size:11px;font-weight:500}.baafcW_mono{font-family:var(--ds-font-family-code,\"SF Mono\", Consolas, monospace);font-size:11px}.baafcW_empty{box-sizing:border-box;border:1px solid var(--lens-border);background:var(--lens-surface-raised);min-height:180px;color:var(--lens-muted);border-radius:16px;flex-direction:column;flex:1;justify-content:center;align-items:center;gap:8px;padding:28px;display:flex;box-shadow:0 12px 32px #1f31520b}.baafcW_emptyTitle{color:var(--dsw-alias-label-primary,#17213a);font-size:16px;font-weight:700}.baafcW_emptyHint{text-align:center;max-width:440px;font-size:12px}@media (width<=900px){.baafcW_root{gap:12px;padding:12px}.baafcW_statusChips{grid-template-columns:repeat(5,minmax(0,1fr));max-width:none}.baafcW_layout{grid-template-columns:minmax(220px,260px) minmax(0,1fr);gap:12px}.baafcW_panel{padding:12px 14px}.baafcW_stat{padding-right:12px}.baafcW_stat+.baafcW_stat{padding-left:12px}}@media (width<=680px){.baafcW_root{height:auto;min-height:100%;overflow:visible}.baafcW_statusChips{grid-template-columns:repeat(2,minmax(0,1fr))}.baafcW_overviewCard:first-child{grid-column:1/-1}.baafcW_layout{flex-direction:column;display:flex}.baafcW_list,.baafcW_inspector{overflow:visible}.baafcW_list{max-height:360px;overflow-y:auto}.baafcW_stats{grid-template-columns:1fr}.baafcW_stat,.baafcW_stat+.baafcW_stat{border-left:0;border-top:1px solid var(--lens-border);padding:10px 2px}.baafcW_stat:first-child{border-top:0}.baafcW_compareRow{grid-template-columns:1fr;gap:3px;padding:9px 4px}.baafcW_compareDetail{padding-left:4px}.baafcW_toolRow{grid-template-columns:minmax(0,1fr) auto}.baafcW_toolRow .baafcW_dim{display:none}}@media (prefers-reduced-motion:reduce){.baafcW_listItem{transition:none}}";
		const tagId = "dsh-context-lens/context-lens.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-context-lens";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var context_lens_module_css_default = {
			"compareLabel": "baafcW_compareLabel",
			"listTitle": "baafcW_listTitle",
			"overviewCard": "baafcW_overviewCard",
			"requestTime": "baafcW_requestTime",
			"overviewIcon": "baafcW_overviewIcon",
			"statValue": "baafcW_statValue",
			"causeList": "baafcW_causeList",
			"listItemSelected": "baafcW_listItemSelected",
			"requestTitleGroup": "baafcW_requestTitleGroup",
			"inspector": "baafcW_inspector",
			"timelineIconAlarm": "baafcW_timelineIconAlarm",
			"panelTitle": "baafcW_panelTitle",
			"stat": "baafcW_stat",
			"overview": "baafcW_overview",
			"emptyTitle": "baafcW_emptyTitle",
			"modelBadge": "baafcW_modelBadge",
			"statusPillAlarm": "baafcW_statusPillAlarm",
			"techToggleIcon": "baafcW_techToggleIcon",
			"toolList": "baafcW_toolList",
			"empty": "baafcW_empty",
			"listItem": "baafcW_listItem",
			"itemMetrics": "baafcW_itemMetrics",
			"techToggle": "baafcW_techToggle",
			"compareMark": "baafcW_compareMark",
			"overviewCardBad": "baafcW_overviewCardBad",
			"toolsToggle": "baafcW_toolsToggle",
			"cacheCell": "baafcW_cacheCell",
			"conclusionWave": "baafcW_conclusionWave",
			"banner": "baafcW_banner",
			"requestIcon": "baafcW_requestIcon",
			"conclusion": "baafcW_conclusion",
			"listCount": "baafcW_listCount",
			"listEmpty": "baafcW_listEmpty",
			"statusPill": "baafcW_statusPill",
			"statValueAlarm": "baafcW_statValueAlarm",
			"statLabel": "baafcW_statLabel",
			"toolsToggleIcon": "baafcW_toolsToggleIcon",
			"toolRow": "baafcW_toolRow",
			"dim": "baafcW_dim",
			"panel": "baafcW_panel",
			"overviewCardOk": "baafcW_overviewCardOk",
			"layout": "baafcW_layout",
			"list": "baafcW_list",
			"conclusionMark": "baafcW_conclusionMark",
			"statusChips": "baafcW_statusChips",
			"providerBadge": "baafcW_providerBadge",
			"statusPillOk": "baafcW_statusPillOk",
			"compareRow": "baafcW_compareRow",
			"cause": "baafcW_cause",
			"seq": "baafcW_seq",
			"techBody": "baafcW_techBody",
			"listHeader": "baafcW_listHeader",
			"compareVerdictChanged": "baafcW_compareVerdictChanged",
			"overviewLabel": "baafcW_overviewLabel",
			"itemTime": "baafcW_itemTime",
			"listItemHead": "baafcW_listItemHead",
			"overviewReading": "baafcW_overviewReading",
			"timelineIcon": "baafcW_timelineIcon",
			"compareVerdict": "baafcW_compareVerdict",
			"mono": "baafcW_mono",
			"stats": "baafcW_stats",
			"emptyHint": "baafcW_emptyHint",
			"overviewCardBody": "baafcW_overviewCardBody",
			"toolName": "baafcW_toolName",
			"techFold": "baafcW_techFold",
			"listToolbar": "baafcW_listToolbar",
			"requestTitle": "baafcW_requestTitle",
			"itemTagAlarm": "baafcW_itemTagAlarm",
			"requestIdentity": "baafcW_requestIdentity",
			"statAccent": "baafcW_statAccent",
			"toolsFold": "baafcW_toolsFold",
			"inspectorHead": "baafcW_inspectorHead",
			"compareDetail": "baafcW_compareDetail",
			"root": "baafcW_root",
			"cacheCellDrop": "baafcW_cacheCellDrop",
			"itemTag": "baafcW_itemTag"
		};
		//#endregion
		//#region src/client/Overview.tsx
		function OverviewIcon(props) {
			const { kind } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				"aria-hidden": "true",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.8",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: [
					kind === "health" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m8.4 12.2 2.2 2.2 5-5.2" })] }),
					kind === "requests" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 7h10M7 12h10M7 17h6" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 5.5v13M20 5.5v13" })] }),
					kind === "cache" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4.5 8.5A8 8 0 0 1 18.6 6" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m18.5 2 .1 4.1-4.1-.1" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19.5 15.5A8 8 0 0 1 5.4 18" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5.5 22-.1-4.1 4.1.1" })
					] }),
					kind === "structure" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "4",
							y: "4",
							width: "6",
							height: "6",
							rx: "1.5"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "14",
							y: "4",
							width: "6",
							height: "6",
							rx: "1.5"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "9",
							y: "14",
							width: "6",
							height: "6",
							rx: "1.5"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 10v2h10v-2M12 12v2" })
					] }),
					kind === "drop" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 5v14h14" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m7.5 9.5 4 4 3-3 4 5" })] })
				]
			});
		}
		function OverviewCard(props) {
			const { icon, label, value, meta, tone } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${context_lens_module_css_default.overviewCard} ${tone === "ok" ? context_lens_module_css_default.overviewCardOk : ""} ${tone === "bad" ? context_lens_module_css_default.overviewCardBad : ""}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: context_lens_module_css_default.overviewIcon,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewIcon, { kind: icon })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: context_lens_module_css_default.overviewCardBody,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: context_lens_module_css_default.overviewLabel,
						children: label
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: context_lens_module_css_default.overviewReading,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: value }), meta !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: meta })]
					})]
				})]
			});
		}
		function Overview(props) {
			const { summary, requests, t } = props;
			const drops = summary.cacheDrops;
			const structural = summary.structuralChanges;
			const latestReuse = requests[requests.length - 1]?.cache?.reuse;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.overview,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: context_lens_module_css_default.statusChips,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewCard, {
							icon: "health",
							label: t("overview.health"),
							value: drops === 0 ? `✓ ${t("overview.cacheStable")}` : t("overview.cacheDrops", { count: String(drops) }),
							tone: drops === 0 ? "ok" : "bad"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewCard, {
							icon: "requests",
							label: t("overview.requestCount"),
							value: String(summary.totalRequests),
							meta: t("overview.requests", { count: String(summary.totalRequests) })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewCard, {
							icon: "cache",
							label: t("overview.hitRate"),
							value: latestReuse === void 0 ? "—" : `${formatPercent(latestReuse)}%`,
							meta: t("inspector.cacheReuse")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewCard, {
							icon: "structure",
							label: t("overview.structure"),
							value: String(structural),
							meta: structural === 0 ? `✓ ${t("overview.structureStable")}` : t("overview.structureChanges", { count: String(structural) }),
							...structural > 0 ? { tone: "bad" } : {}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewCard, {
							icon: "drop",
							label: t("overview.dropCount"),
							value: String(drops),
							meta: drops === 0 ? t("overview.none") : t("overview.needsAttention"),
							...drops > 0 ? { tone: "bad" } : {}
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/RequestInspector.tsx
		/**
		* The request inspector: change-first. The head names the request and its
		* one-line status; the primary readout shows cache reuse (with the delta vs
		* the predecessor), new uncached input, and the estimated context surface;
		* the comparison panel answers "what changed vs the previous request" line
		* by line; a conclusion line says whether anything looks cache-impacting.
		* Raw usage buckets, header hashes, and the full tool list live behind the
		* technical-details fold.
		*/
		const CAUSE_KEY = {
			"model-or-provider-changed": "cause.model-or-provider-changed",
			"system-changed": "cause.system-changed",
			"tools-changed": "cause.tools-changed",
			"config-changed": "cause.config-changed",
			"surface-grew": "cause.surface-grew",
			"no-obvious-change": "cause.no-obvious-change"
		};
		function InspectorIcon(props) {
			const { kind } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				"aria-hidden": "true",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.8",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children: [
					kind === "request" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 4.5h14v11H9l-4 4v-15Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 8h8M8 12h5" })] }),
					kind === "system" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 4.5h14v12H8l-3 3v-15Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 9h6M9 12.5h4" })] }),
					kind === "tools" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m14.5 5 4.5 4.5-9.8 9.8-4.5-4.5L14.5 5Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m12.5 7 4.5 4.5M7 12.5l4.5 4.5" })] }),
					kind === "order" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 6h11M8 12h8M8 18h5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m3.5 5 1 1 2-2M3.5 11l1 1 2-2M3.5 17l1 1 2-2" })] }),
					kind === "config" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 7h8M16 7h4M4 17h4M12 17h8" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: "14",
							cy: "7",
							r: "2"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: "10",
							cy: "17",
							r: "2"
						})
					] }),
					kind === "model" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m4.5 7.8 7.5 4.3 7.5-4.3M12 12v8.5" })] }),
					kind === "provider" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "8.5"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.8 12h16.4M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5C9.7 18.1 8.5 15.3 8.5 12S9.7 5.9 12 3.5Z" })] }),
					kind === "surface" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 15.5c2.4-5 5.2-5 8-1s5.5 4 8-2" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 19.5c2.4-5 5.2-5 8-1s5.5 4 8-2" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 11.5c2.4-5 5.2-5 8-1s5.5 4 8-2" })
					] }),
					kind === "check" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "9"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m7.8 12.2 2.7 2.7 5.8-6" })] })
				]
			});
		}
		/** First `limit` items of a name list, ellipsized. */
		function cappedList(names, limit) {
			const text = names.slice(0, limit).join(", ");
			return names.length > limit ? `${text}…` : text;
		}
		/** One stat row of the primary readout. */
		function MainStat(props) {
			const { label, value, detail, alarm, accent } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${context_lens_module_css_default.stat} ${accent === true ? context_lens_module_css_default.statAccent : ""}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: context_lens_module_css_default.statLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: `${context_lens_module_css_default.statValue} ${alarm === true ? context_lens_module_css_default.statValueAlarm : ""}`,
					children: [value, detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: context_lens_module_css_default.dim,
						children: [" ", detail]
					})]
				})]
			});
		}
		/** One row of the comparison panel: label + verdict. */
		function CompareRow(props) {
			const { label, verdict, changed, kind } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.compareRow,
				"data-kind": kind,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: context_lens_module_css_default.compareLabel,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: context_lens_module_css_default.compareMark,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InspectorIcon, { kind })
					}), label]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: `${context_lens_module_css_default.compareVerdict} ${changed === true ? context_lens_module_css_default.compareVerdictChanged : ""}`,
					children: verdict
				})]
			});
		}
		function ToolsDiff(props) {
			const { added, removed, modified, t } = props;
			if (added.length === 0 && removed.length === 0 && modified.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.compareDetail,
				children: t("inspector.diff.tools", {
					added: added.length === 0 ? "0" : cappedList(added, 4),
					removed: removed.length === 0 ? "0" : cappedList(removed, 4),
					modified: modified.length === 0 ? "0" : cappedList(modified, 4)
				})
			});
		}
		function RequestInspector(props) {
			const { request, ordinal, previousOrdinal, t } = props;
			const [techOpen, setTechOpen] = (0, react.useState)(false);
			const [toolsOpen, setToolsOpen] = (0, react.useState)(false);
			if (request === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.inspector,
				children: t("list.empty")
			});
			const { usage, cache, header, diffFromPrevious } = request;
			const diff = diffFromPrevious;
			const tag = requestTag(request, t);
			const drop = cache?.drop === true && cache.deltaPoints !== void 0;
			const hasStructuralChange = diff !== void 0 && (diff.tools.changed || diff.system.changed || diff.configChanged || diff.modelChanged || diff.providerChanged);
			const surfaceDelta = diff?.surface.estimatedDeltaTokens;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.inspector,
				children: [
					drop && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_lens_module_css_default.banner,
						children: t("inspector.drop.banner", { delta: String(Math.round(Math.abs(cache.deltaPoints))) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.inspectorHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.requestTitleGroup,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: context_lens_module_css_default.requestIcon,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InspectorIcon, { kind: "request" })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: context_lens_module_css_default.requestTitle,
									children: t("inspector.request", { ordinal: String(ordinal) })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${context_lens_module_css_default.statusPill} ${tag.alarming ? context_lens_module_css_default.statusPillAlarm : context_lens_module_css_default.statusPillOk}`,
									children: tag.text
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: context_lens_module_css_default.requestTime,
									children: new Date(request.time).toLocaleTimeString()
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.requestIdentity,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.modelBadge,
								children: request.model ?? t("inspector.unavailable")
							}), request.provider !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.providerBadge,
								children: request.provider
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_lens_module_css_default.panel,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.stats,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
									label: t("inspector.cacheReuse"),
									value: cache?.reuse === void 0 ? t("inspector.unavailable") : `${formatPercent(cache.reuse)}%`,
									...cache?.deltaPoints === void 0 ? {} : { detail: cache.deltaPoints < 0 ? t("inspector.deltaDown", { delta: String(Math.round(Math.abs(cache.deltaPoints))) }) : t("inspector.deltaUp", { delta: String(Math.round(cache.deltaPoints)) }) },
									alarm: cache?.drop === true,
									accent: true
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
									label: t("inspector.newInput"),
									value: usage?.inputTokens === void 0 ? t("inspector.unavailable") : `${formatTokens(usage.inputTokens)} tok`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
									label: t("inspector.contextSurface"),
									value: `${formatTokens(request.estimatedSurfaceTokens)} tok`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
									label: t("inspector.cacheImpact"),
									value: cache?.deltaPoints === void 0 ? "—" : `${Math.round(cache.deltaPoints)} pt`,
									...cache?.deltaPoints === void 0 || cache.deltaPoints === 0 ? { detail: t("inspector.noChange") } : {},
									alarm: cache?.drop === true
								})
							]
						})
					}),
					diff !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.panel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.panelTitle,
								children: previousOrdinal === null ? t("inspector.compare", { prev: "—" }) : t("inspector.compare", { prev: `#${String(previousOrdinal)}` })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								kind: "system",
								label: t("inspector.compare.system"),
								verdict: diff.system.changed ? t("inspector.changed") : t("inspector.noChange"),
								changed: diff.system.changed
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								kind: "tools",
								label: t("inspector.compare.tools"),
								verdict: diff.tools.changed ? (() => {
									const after = header.toolCount ?? header.tools.length;
									const before = after - diff.tools.added.length + diff.tools.removed.length;
									return t("inspector.compare.toolsChanged", {
										before: String(before),
										after: String(after)
									});
								})() : t("inspector.compare.toolsDetail", { count: String(header.toolCount ?? header.tools.length) }),
								changed: diff.tools.changed
							}),
							diff.tools.changed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolsDiff, {
								added: diff.tools.added,
								removed: diff.tools.removed,
								modified: diff.tools.modified,
								t
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								kind: "order",
								label: t("inspector.compare.order"),
								verdict: diff.tools.orderChanged ? t("inspector.changed") : t("inspector.noChange"),
								changed: diff.tools.orderChanged
							}),
							diff.tools.orderChanged && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.compareDetail,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: context_lens_module_css_default.dim,
									children: t("inspector.diff.tools.orderHint")
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								kind: "config",
								label: t("inspector.compare.config"),
								verdict: diff.configChanged ? t("inspector.changed") : t("inspector.noChange"),
								changed: diff.configChanged
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								kind: "model",
								label: t("inspector.compare.model"),
								verdict: diff.modelChanged ? `→ ${request.model ?? "?"}` : request.model ?? t("inspector.noChange"),
								changed: diff.modelChanged
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								kind: "provider",
								label: t("inspector.compare.provider"),
								verdict: diff.providerChanged ? `→ ${request.provider ?? "?"}` : t("inspector.noChange"),
								changed: diff.providerChanged
							}),
							surfaceDelta !== void 0 && surfaceDelta > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								kind: "surface",
								label: t("inspector.compare.surface"),
								verdict: t("inspector.compare.surfaceDelta", { delta: formatTokens(surfaceDelta) }),
								changed: surfaceDelta >= 1024
							}),
							diff.likelyCauses !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: context_lens_module_css_default.causeList,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: context_lens_module_css_default.panelTitle,
										children: t("inspector.likely.title")
									}),
									diff.likelyCauses.map((cause) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: context_lens_module_css_default.cause,
										children: t(CAUSE_KEY[cause])
									}, cause)),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: context_lens_module_css_default.dim,
										children: t("inspector.likely.hint")
									})
								]
							})
						]
					}),
					drop === false && !hasStructuralChange && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.conclusion,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.conclusionMark,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InspectorIcon, { kind: "check" })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("inspector.conclusion.ok") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: t("inspector.conclusion.detail") })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								className: context_lens_module_css_default.conclusionWave,
								viewBox: "0 0 320 80",
								"aria-hidden": "true",
								fill: "none",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M0 50C54 10 104 78 164 40s98-18 156 10" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M0 60C62 20 112 86 172 48s96-16 148 6" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 38c48-30 94 22 144-2s94-28 148 4" })
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.techFold,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: context_lens_module_css_default.techToggle,
							onClick: () => setTechOpen((open) => !open),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.techToggleIcon,
								children: techOpen ? "▾" : "▸"
							}), techOpen ? t("inspector.tech.hide") : t("inspector.tech.show")]
						}), techOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.techBody,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: context_lens_module_css_default.panel,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: context_lens_module_css_default.panelTitle,
									children: t("inspector.usage")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: context_lens_module_css_default.stats,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
											label: t("inspector.cacheRead"),
											value: usage?.cacheReadTokens === void 0 ? t("inspector.unavailable") : formatTokens(usage.cacheReadTokens)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
											label: t("inspector.cacheWrite"),
											value: usage?.cacheWriteTokens === void 0 ? t("inspector.unavailable") : formatTokens(usage.cacheWriteTokens)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
											label: t("inspector.output"),
											value: usage?.outputTokens === void 0 ? t("inspector.unavailable") : formatTokens(usage.outputTokens)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
											label: t("inspector.reasoning"),
											value: usage?.reasoningTokens === void 0 ? t("inspector.unavailable") : formatTokens(usage.reasoningTokens)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
											label: t("inspector.surface"),
											value: `${formatTokens(request.estimatedSurfaceTokens)} tok`
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
											label: t("inspector.cacheReuse"),
											value: cache?.reuse === void 0 ? t("inspector.unavailable") : `${formatPercent(cache.reuse)}%`
										})
									]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: context_lens_module_css_default.panel,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: context_lens_module_css_default.panelTitle,
										children: t("inspector.header")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: context_lens_module_css_default.stats,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
												label: t("inspector.configHash"),
												value: shortHash(header.configHash)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
												label: t("inspector.systemHash"),
												value: header.systemHash === void 0 ? t("inspector.unavailable") : shortHash(header.systemHash),
												...header.systemBytes === void 0 ? {} : { detail: `${formatTokens(header.systemBytes)}B` }
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
												label: t("inspector.tools", { count: String(header.toolCount ?? header.tools.length) }),
												value: header.toolsHash === void 0 ? t("inspector.unavailable") : shortHash(header.toolsHash)
											}),
											request.contextWindow !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
												label: t("inspector.contextWindow"),
												value: formatTokens(request.contextWindow)
											})
										]
									}),
									header.tools.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: context_lens_module_css_default.toolsFold,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: context_lens_module_css_default.toolsToggle,
											onClick: () => setToolsOpen((open) => !open),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: context_lens_module_css_default.toolsToggleIcon,
												children: toolsOpen ? "▾" : "▸"
											}), toolsOpen ? t("inspector.tools.hide") : t("inspector.tools.show", { count: String(header.tools.length) })]
										}), toolsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: context_lens_module_css_default.toolList,
											children: header.tools.map((tool) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: context_lens_module_css_default.toolRow,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: context_lens_module_css_default.toolName,
														children: tool.name
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: context_lens_module_css_default.mono,
														children: shortHash(tool.schemaHash)
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: context_lens_module_css_default.dim,
														children: [formatTokens(tool.estimatedTokens), " tok"]
													})
												]
											}, tool.name))
										})]
									})
								]
							})]
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/RequestList.tsx
		/**
		* The recent-requests list: newest first, one card per request, each card
		* summarized to ONE line of meaning — the session-global ordinal, the
		* change tag (stable / cache drop / tools changed / …), and the cache
		* readout. Unchanged requests are hidden by default so the list answers
		* "where are the interesting requests?" instead of scrolling 358 identical
		* rows.
		*/
		function cacheReadout(request, t) {
			if (request.cache?.reuse === void 0) return {
				text: t("list.cache.unavailable"),
				drop: false
			};
			return {
				text: t("list.cache", { percent: formatPercent(request.cache.reuse) }),
				drop: request.cache.drop === true
			};
		}
		function requestTime(time) {
			return new Intl.DateTimeFormat(void 0, {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false
			}).format(time);
		}
		function RequestList(props) {
			const { requests, totalRequests, selectedId, onSelect, t } = props;
			const selectedRef = (0, react.useRef)(null);
			const [hideUnchanged, setHideUnchanged] = (0, react.useState)(true);
			const ordered = (0, react.useMemo)(() => [...requests].reverse(), [requests]);
			const visible = (0, react.useMemo)(() => ordered.filter((request) => !hideUnchanged || !isUnchanged(request)), [ordered, hideUnchanged]);
			(0, react.useEffect)(() => {
				selectedRef.current?.scrollIntoView({ block: "nearest" });
			}, [selectedId, visible]);
			if (requests.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.list,
				children: t("list.empty")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.list,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.listHeader,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: context_lens_module_css_default.listTitle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								viewBox: "0 0 24 24",
								"aria-hidden": "true",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "1.8",
								strokeLinecap: "round",
								strokeLinejoin: "round",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
									cx: "12",
									cy: "12",
									r: "8.5"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 7.5v5l3.2 1.8" })]
							}), t("list.title")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: context_lens_module_css_default.listCount,
							children: totalRequests
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: context_lens_module_css_default.listToolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: hideUnchanged,
							onChange: (event) => setHideUnchanged(event.target.checked)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("list.hideUnchanged") })]
					}),
					visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_lens_module_css_default.listEmpty,
						children: t("list.filtered.empty")
					}) : visible.map((request) => {
						const tag = requestTag(request, t);
						const cache = cacheReadout(request, t);
						const ordinal = globalOrdinal(requests.indexOf(request), requests.length, totalRequests);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							ref: request.id === selectedId ? selectedRef : void 0,
							className: `${context_lens_module_css_default.listItem} ${request.id === selectedId ? context_lens_module_css_default.listItemSelected : ""}`,
							onClick: () => onSelect(request.id),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: context_lens_module_css_default.listItemHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: `${context_lens_module_css_default.timelineIcon} ${tag.alarming ? context_lens_module_css_default.timelineIconAlarm : ""}`,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
											viewBox: "0 0 20 20",
											"aria-hidden": "true",
											fill: "none",
											stroke: "currentColor",
											strokeWidth: "2",
											strokeLinecap: "round",
											strokeLinejoin: "round",
											children: tag.alarming ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 3 17 16H3L10 3Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 7.2v4.2M10 14h.01" })] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
												cx: "10",
												cy: "10",
												r: "7"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6.8 10.2 2 2 4.5-4.6" })] })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: context_lens_module_css_default.seq,
										children: ["#", ordinal]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: `${context_lens_module_css_default.itemTag} ${tag.alarming ? context_lens_module_css_default.itemTagAlarm : ""}`,
										children: tag.text
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: context_lens_module_css_default.itemTime,
										children: requestTime(request.time)
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: context_lens_module_css_default.itemMetrics,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										"+",
										request.usage?.inputTokens === void 0 ? "—" : formatTokens(request.usage.inputTokens),
										" tok"
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [formatTokens(request.estimatedSurfaceTokens), " ctx"] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: `${context_lens_module_css_default.cacheCell} ${cache.drop ? context_lens_module_css_default.cacheCellDrop : ""}`,
										children: cache.text
									})
								]
							})]
						}, request.id);
					})
				]
			});
		}
		//#endregion
		//#region src/client/ContextView.tsx
		/**
		* The Context Lens conversation view: a three-part reader over the
		* `contextLens` projection — an overview strip, the recent-requests list,
		* and the inspector for the selected request. Selection is component-local;
		* everything else arrives through the framework `useProjection` seat.
		*/
		/** The most recently finalized request's id, when a projection is present. */
		function latestRequestId(requests) {
			const latest = requests[requests.length - 1];
			return latest === void 0 ? null : latest.id;
		}
		function ContextView(props) {
			const { useProjection, t } = props;
			const projection = useProjection("contextLens");
			const [selectedId, setSelectedId] = (0, react.useState)(null);
			const rootRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				let node = rootRef.current;
				let scroller = null;
				while (node !== null) {
					if (node.scrollHeight > node.clientHeight + 4) {
						scroller = node;
						break;
					}
					node = node.parentElement;
				}
				if (scroller === null) return;
				const enterTop = scroller.scrollTop;
				scroller.scrollTop = 0;
				return () => {
					scroller.scrollTop = enterTop;
				};
			}, []);
			const requests = (0, react.useMemo)(() => projection?.recentRequests ?? [], [projection]);
			const selected = (0, react.useMemo)(() => requests.find((request) => request.id === selectedId), [requests, selectedId]);
			if (projection === void 0 || requests.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				className: context_lens_module_css_default.root,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: context_lens_module_css_default.empty,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_lens_module_css_default.emptyTitle,
						children: t("empty.title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_lens_module_css_default.emptyHint,
						children: t("empty.hint")
					})]
				})
			});
			projection.latest ?? requests[requests.length - 1];
			const effectiveSelectedId = selected === void 0 ? latestRequestId(requests) : selectedId;
			const selectedIndex = requests.findIndex((request) => request.id === effectiveSelectedId);
			const ordinal = selectedIndex === -1 ? 0 : globalOrdinal(selectedIndex, requests.length, projection.summary.totalRequests);
			const previousOrdinal = selectedIndex <= 0 ? null : globalOrdinal(selectedIndex - 1, requests.length, projection.summary.totalRequests);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				ref: rootRef,
				className: context_lens_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Overview, {
					summary: projection.summary,
					requests,
					t
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: context_lens_module_css_default.layout,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RequestList, {
						requests,
						totalRequests: projection.summary.totalRequests,
						selectedId: effectiveSelectedId,
						onSelect: setSelectedId,
						t
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RequestInspector, {
						request: requests.find((request) => request.id === effectiveSelectedId) ?? null,
						ordinal,
						previousOrdinal,
						t
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: the conversation slot registry and the locale service. */
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: install the dictionaries and register the Context Lens
		* view tab.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "context-lens: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "context-lens",
				order: 30,
				locale: NS,
				label: () => t("view.context")
			}, ContextView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map