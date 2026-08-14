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
		/** Whether a request counts as "unchanged" for the list filter (stable + completed). */
		function isUnchanged(request) {
			return request.status === "completed" && !structurallyChanged(request);
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
		const css = ".baafcW_root{box-sizing:border-box;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#1f2329);flex-direction:column;gap:12px;padding:12px;font-size:13px;display:flex;overflow:hidden}.baafcW_overview{flex-direction:column;flex:none;gap:8px;display:flex}.baafcW_statusChips{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.baafcW_statusChip{border-radius:999px;align-items:center;gap:5px;padding:3px 10px;font-size:12px;font-weight:600;line-height:1.4;display:inline-flex}.baafcW_statusChipOk{color:var(--dsw-static-green-700,#1b5e20);background:var(--dsw-alias-interactive-bg-hover-success,#1b5e201a)}.baafcW_statusChipBad{color:var(--dsw-static-red-600,#c62828);background:var(--dsw-alias-interactive-bg-hover-danger,#ec131314)}.baafcW_overviewCount{color:var(--dsw-alias-label-caption,#8a919f);font-size:12px}.baafcW_banner{border:1px solid var(--dsw-static-red-300,#ef9a9a);background:var(--dsw-alias-interactive-bg-hover-danger,#ec13130d);color:var(--dsw-static-red-600,#c62828);border-radius:6px;padding:6px 10px;font-size:12px}.baafcW_layout{flex:1;gap:12px;min-height:0;display:flex}.baafcW_list{border-right:1px solid var(--dsw-alias-button-ghost-active-border,#80808033);width:300px;color:var(--dsw-alias-label-caption,#8a919f);flex-direction:column;flex:none;gap:3px;padding-right:8px;display:flex;overflow-y:auto}.baafcW_listToolbar{cursor:pointer;user-select:none;flex:none;align-items:center;gap:6px;padding:2px 4px 6px;font-size:12px;display:inline-flex}.baafcW_listToolbar input{accent-color:var(--dsw-static-blue-600,#3964fe);margin:0}.baafcW_listEmpty{color:var(--dsw-alias-label-caption,#8a919f);padding:12px 8px;font-size:12px}.baafcW_listItem{color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:1px solid #0000;border-radius:8px;align-items:center;gap:10px;padding:7px 10px;display:flex}.baafcW_listItem:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.baafcW_listItemSelected{background:var(--dsw-alias-interactive-bg-active,#2631481a);border-color:var(--dsw-alias-interactive-bg-active,#2631482e)}.baafcW_seq{font-family:var(--ds-font-family-code,\"SF Mono\", Consolas, monospace);color:var(--dsw-alias-label-caption,#8a919f);flex:none;min-width:42px;font-size:11px}.baafcW_itemTag{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-primary,#1f2329);flex:1;font-size:12px;overflow:hidden}.baafcW_itemTagAlarm{color:var(--dsw-static-red-600,#c62828);font-weight:600}.baafcW_cacheCell{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#1f2329);flex:none;font-size:12px;font-weight:600}.baafcW_cacheCellDrop{color:var(--dsw-static-red-600,#c62828)}.baafcW_inspector{min-width:0;color:var(--dsw-alias-label-caption,#8a919f);flex-direction:column;flex:1;gap:10px;display:flex;overflow-y:auto}.baafcW_inspectorHead{align-items:center;gap:10px;display:flex}.baafcW_statusPill{border-radius:999px;padding:3px 9px;font-size:11px;font-weight:600;line-height:1}.baafcW_statusPillOk{color:var(--dsw-static-green-700,#1b5e20);background:var(--dsw-alias-interactive-bg-hover-success,#1b5e201a)}.baafcW_statusPillAlarm{color:var(--dsw-static-red-600,#c62828);background:var(--dsw-alias-interactive-bg-hover-danger,#ec131314)}.baafcW_panel{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-radius:6px;flex-direction:column;gap:6px;padding:8px 10px;display:flex}.baafcW_panelTitle{color:var(--dsw-alias-label-primary,#1f2329);align-items:center;gap:8px;font-size:12px;font-weight:600;display:flex}.baafcW_stats{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 12px;display:grid}.baafcW_stat{flex-direction:column;gap:2px;display:flex}.baafcW_statLabel{color:var(--dsw-alias-label-caption,#8a919f);font-size:11px}.baafcW_statValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#1f2329);word-break:break-all}.baafcW_statValueAlarm{color:var(--dsw-static-red-600,#c62828);font-weight:600}.baafcW_compareRow{align-items:baseline;gap:10px;font-size:12px;display:flex}.baafcW_compareLabel{min-width:76px;color:var(--dsw-alias-label-caption,#8a919f);flex:none}.baafcW_compareVerdict{color:var(--dsw-alias-label-primary,#1f2329)}.baafcW_compareVerdictChanged{color:var(--dsw-static-red-600,#c62828);font-weight:600}.baafcW_compareDetail{color:var(--dsw-alias-label-primary,#1f2329);padding-left:86px;font-size:12px}.baafcW_conclusion{background:var(--dsw-alias-interactive-bg-hover-success,#1b5e2014);color:var(--dsw-static-green-700,#1b5e20);border-radius:6px;padding:6px 10px;font-size:12px}.baafcW_techFold{flex-direction:column;gap:8px;display:flex}.baafcW_techToggle{color:var(--dsw-alias-label-caption,#8a919f);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;align-self:flex-start;align-items:center;gap:6px;padding:2px 6px;font-size:12px;display:inline-flex}.baafcW_techToggle:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-label-primary,#1f2329)}.baafcW_techToggleIcon{color:var(--dsw-alias-label-caption,#8a919f);font-size:10px}.baafcW_techBody{flex-direction:column;gap:10px;display:flex}.baafcW_toolsFold{flex-direction:column;gap:4px;margin-top:6px;display:flex}.baafcW_toolsToggle{color:var(--dsw-alias-label-caption,#8a919f);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;align-self:flex-start;align-items:center;gap:6px;padding:2px 6px;font-size:12px;display:inline-flex}.baafcW_toolsToggle:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-label-primary,#1f2329)}.baafcW_toolsToggleIcon{color:var(--dsw-alias-label-caption,#8a919f);font-size:10px}.baafcW_toolList{flex-direction:column;gap:2px;margin-top:2px;display:flex}.baafcW_toolRow{align-items:baseline;gap:8px;font-size:12px;display:flex}.baafcW_toolName{color:var(--dsw-alias-label-primary,#1f2329);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.baafcW_causeList{border-top:1px dashed var(--dsw-alias-button-ghost-active-border,#80808033);flex-direction:column;gap:4px;margin-top:4px;padding-top:6px;display:flex}.baafcW_cause{color:var(--dsw-static-red-600,#c62828);font-size:12px}.baafcW_dim{color:var(--dsw-alias-label-caption,#8a919f);font-size:11px}.baafcW_mono{font-family:var(--ds-font-family-code,\"SF Mono\", Consolas, monospace);font-size:11px}.baafcW_empty{color:var(--dsw-alias-label-caption,#8a919f);flex-direction:column;flex:1;justify-content:center;align-items:center;gap:6px;display:flex}.baafcW_emptyTitle{color:var(--dsw-alias-label-primary,#1f2329);font-size:14px;font-weight:600}.baafcW_emptyHint{font-size:12px}";
		const tagId = "dsh-context-lens/context-lens.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-context-lens";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var context_lens_module_css_default = {
			"toolName": "baafcW_toolName",
			"dim": "baafcW_dim",
			"statLabel": "baafcW_statLabel",
			"statusChipOk": "baafcW_statusChipOk",
			"statValue": "baafcW_statValue",
			"inspectorHead": "baafcW_inspectorHead",
			"statusChip": "baafcW_statusChip",
			"layout": "baafcW_layout",
			"listItemSelected": "baafcW_listItemSelected",
			"toolRow": "baafcW_toolRow",
			"cause": "baafcW_cause",
			"toolsToggleIcon": "baafcW_toolsToggleIcon",
			"statValueAlarm": "baafcW_statValueAlarm",
			"statusChipBad": "baafcW_statusChipBad",
			"toolsToggle": "baafcW_toolsToggle",
			"itemTagAlarm": "baafcW_itemTagAlarm",
			"cacheCellDrop": "baafcW_cacheCellDrop",
			"panel": "baafcW_panel",
			"compareVerdictChanged": "baafcW_compareVerdictChanged",
			"conclusion": "baafcW_conclusion",
			"statusPillOk": "baafcW_statusPillOk",
			"techToggle": "baafcW_techToggle",
			"list": "baafcW_list",
			"overviewCount": "baafcW_overviewCount",
			"seq": "baafcW_seq",
			"itemTag": "baafcW_itemTag",
			"causeList": "baafcW_causeList",
			"techBody": "baafcW_techBody",
			"compareVerdict": "baafcW_compareVerdict",
			"statusPillAlarm": "baafcW_statusPillAlarm",
			"overview": "baafcW_overview",
			"listEmpty": "baafcW_listEmpty",
			"stats": "baafcW_stats",
			"toolsFold": "baafcW_toolsFold",
			"toolList": "baafcW_toolList",
			"emptyHint": "baafcW_emptyHint",
			"cacheCell": "baafcW_cacheCell",
			"techToggleIcon": "baafcW_techToggleIcon",
			"emptyTitle": "baafcW_emptyTitle",
			"root": "baafcW_root",
			"listToolbar": "baafcW_listToolbar",
			"listItem": "baafcW_listItem",
			"banner": "baafcW_banner",
			"compareRow": "baafcW_compareRow",
			"inspector": "baafcW_inspector",
			"mono": "baafcW_mono",
			"compareLabel": "baafcW_compareLabel",
			"techFold": "baafcW_techFold",
			"empty": "baafcW_empty",
			"compareDetail": "baafcW_compareDetail",
			"stat": "baafcW_stat",
			"statusChips": "baafcW_statusChips",
			"statusPill": "baafcW_statusPill",
			"panelTitle": "baafcW_panelTitle"
		};
		//#endregion
		//#region src/client/Overview.tsx
		function Overview(props) {
			const { summary, t } = props;
			const drops = summary.cacheDrops;
			const structural = summary.structuralChanges;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.overview,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: context_lens_module_css_default.statusChips,
					children: [
						drops === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: `${context_lens_module_css_default.statusChip} ${context_lens_module_css_default.statusChipOk}`,
							children: ["✓ ", t("overview.cacheStable")]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: `${context_lens_module_css_default.statusChip} ${context_lens_module_css_default.statusChipBad}`,
							children: ["⚠ ", t("overview.cacheDrops", { count: String(drops) })]
						}),
						structural === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: `${context_lens_module_css_default.statusChip} ${context_lens_module_css_default.statusChipOk}`,
							children: ["✓ ", t("overview.structureStable")]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: `${context_lens_module_css_default.statusChip} ${context_lens_module_css_default.statusChipBad}`,
							children: ["⚠ ", t("overview.structureChanges", { count: String(structural) })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: context_lens_module_css_default.overviewCount,
							children: t("overview.requests", { count: String(summary.totalRequests) })
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
		/** First `limit` items of a name list, ellipsized. */
		function cappedList(names, limit) {
			const text = names.slice(0, limit).join(", ");
			return names.length > limit ? `${text}…` : text;
		}
		/** One stat row of the primary readout. */
		function MainStat(props) {
			const { label, value, detail, alarm } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.stat,
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
			const { label, verdict, changed } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.compareRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: context_lens_module_css_default.compareLabel,
					children: label
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
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: context_lens_module_css_default.seq,
							children: ["#", ordinal]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${context_lens_module_css_default.statusPill} ${tag.alarming ? context_lens_module_css_default.statusPillAlarm : context_lens_module_css_default.statusPillOk}`,
							children: tag.text
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
									alarm: cache?.drop === true
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
									label: t("inspector.newInput"),
									value: usage?.inputTokens === void 0 ? t("inspector.unavailable") : `${formatTokens(usage.inputTokens)} tok`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MainStat, {
									label: t("inspector.contextSurface"),
									value: `${formatTokens(request.estimatedSurfaceTokens)} tok`
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
								label: t("inspector.compare.system"),
								verdict: diff.system.changed ? t("inspector.changed") : t("inspector.noChange"),
								changed: diff.system.changed
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
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
								label: t("inspector.compare.config"),
								verdict: diff.configChanged ? t("inspector.changed") : t("inspector.noChange"),
								changed: diff.configChanged
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								label: t("inspector.compare.model"),
								verdict: diff.modelChanged ? `→ ${request.model ?? "?"}` : request.model ?? t("inspector.noChange"),
								changed: diff.modelChanged
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
								label: t("inspector.compare.provider"),
								verdict: diff.providerChanged ? `→ ${request.provider ?? "?"}` : t("inspector.noChange"),
								changed: diff.providerChanged
							}),
							surfaceDelta !== void 0 && surfaceDelta > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompareRow, {
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
					drop === false && !hasStructuralChange && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_lens_module_css_default.conclusion,
						children: t("inspector.conclusion.ok")
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
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: context_lens_module_css_default.listToolbar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: hideUnchanged,
						onChange: (event) => setHideUnchanged(event.target.checked)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("list.hideUnchanged") })]
				}), visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: context_lens_module_css_default.seq,
								children: ["#", ordinal]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${context_lens_module_css_default.itemTag} ${tag.alarming ? context_lens_module_css_default.itemTagAlarm : ""}`,
								children: tag.text
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${context_lens_module_css_default.cacheCell} ${cache.drop ? context_lens_module_css_default.cacheCellDrop : ""}`,
								children: cache.text
							})
						]
					}, request.id);
				})]
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
				className: context_lens_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Overview, {
					summary: projection.summary,
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