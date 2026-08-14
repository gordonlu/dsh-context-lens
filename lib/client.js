window.__ModuleLoader__.load({
	id: "dsh-context-lens",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/**
		* dsh-context-lens client dictionaries and the `context-lens` locale
		* namespace. `ContextLensKey` is the union of every copy key; it is declared
		* into the framework's merge-extensible `LocaleNamespaceMap`, which types the
		* `t` seat on the view component props.
		*
		* @module dsh-context-lens/client/locales
		*/
		const NS = "context-lens";
		/** Chinese product copy (primary). */
		const zh = {
			"view.context": "请求上下文",
			"overview.title": "概览",
			"overview.requests": "请求",
			"overview.cacheDrops": "缓存回落",
			"overview.structuralChanges": "结构变化",
			"list.title": "最近请求",
			"list.empty": "还没有 LLM 请求。发送一条消息后这里会出现每次请求的结构变化与缓存复用情况。",
			"list.cache": "缓存 {percent}%",
			"list.cache.drop": "缓存回落",
			"list.cache.unavailable": "用量 n/a",
			"list.changed": "有变化",
			"list.status.completed": "完成",
			"list.status.failed": "失败",
			"list.status.aborted": "中止",
			"inspector.usage": "用量",
			"inspector.input": "输入(未缓存)",
			"inspector.cacheRead": "缓存读取",
			"inspector.cacheWrite": "缓存写入",
			"inspector.output": "输出",
			"inspector.reasoning": "推理",
			"inspector.unavailable": "unavailable",
			"inspector.cacheReuse": "缓存复用",
			"inspector.surface": "估算表面",
			"inspector.header": "请求头部",
			"inspector.configHash": "配置",
			"inspector.systemHash": "系统提示",
			"inspector.tools": "工具 {count}",
			"inspector.tools.show": "工具明细 {count}",
			"inspector.tools.hide": "收起工具明细",
			"inspector.model": "模型",
			"inspector.contextWindow": "上下文窗口",
			"inspector.diff.title": "与上次请求的差异",
			"inspector.diff.none": "无结构变化",
			"inspector.diff.model": "模型 {before} → {after}",
			"inspector.diff.provider": "服务商 {before} → {after}",
			"inspector.diff.config": "请求配置变化",
			"inspector.diff.system": "系统提示变化",
			"inspector.diff.tools": "工具 +{added} −{removed} ~{modified}",
			"inspector.diff.tools.order": "工具顺序变化",
			"inspector.diff.tools.orderHint": "结构与模式未变，但声明顺序改变，可能影响 provider 序列化与前缀缓存。",
			"inspector.diff.surface": "估算表面 +{delta} tokens",
			"inspector.diff.cache": "缓存复用 {before}% → {after}% ({delta} 个百分点)",
			"inspector.likely.title": "同时发生的变化",
			"inspector.likely.hint": "仅相关，不构成因果。",
			"inspector.drop.banner": "缓存复用较上次请求回落 {delta} 个百分点",
			"cause.model-or-provider-changed": "模型或服务商变化",
			"cause.system-changed": "系统提示变化",
			"cause.tools-changed": "工具集变化",
			"cause.config-changed": "请求配置变化",
			"cause.surface-grew": "对话表面增长",
			"cause.no-obvious-change": "无明显的请求变化",
			"empty.title": "暂无数据",
			"empty.hint": "Context Lens 会在 LLM 请求开始流动后自动观察。"
		};
		/** English product copy (secondary). */
		const en = {
			"view.context": "Request Context",
			"overview.title": "Overview",
			"overview.requests": "Requests",
			"overview.cacheDrops": "Cache drops",
			"overview.structuralChanges": "Structural changes",
			"list.title": "Recent requests",
			"list.empty": "No LLM requests yet. Send a message and each request's structural changes and cache reuse will appear here.",
			"list.cache": "cache {percent}%",
			"list.cache.drop": "cache drop",
			"list.cache.unavailable": "usage n/a",
			"list.changed": "changed",
			"list.status.completed": "completed",
			"list.status.failed": "failed",
			"list.status.aborted": "aborted",
			"inspector.usage": "Usage",
			"inspector.input": "Input (uncached)",
			"inspector.cacheRead": "Cache read",
			"inspector.cacheWrite": "Cache write",
			"inspector.output": "Output",
			"inspector.reasoning": "Reasoning",
			"inspector.unavailable": "unavailable",
			"inspector.cacheReuse": "Cache reuse",
			"inspector.surface": "Est. surface",
			"inspector.header": "Request header",
			"inspector.configHash": "Config",
			"inspector.systemHash": "System prompt",
			"inspector.tools": "Tools {count}",
			"inspector.tools.show": "Tool detail ({count})",
			"inspector.tools.hide": "Hide tool detail",
			"inspector.model": "Model",
			"inspector.contextWindow": "Context window",
			"inspector.diff.title": "Changes vs previous request",
			"inspector.diff.none": "No structural changes",
			"inspector.diff.model": "Model {before} → {after}",
			"inspector.diff.provider": "Provider {before} → {after}",
			"inspector.diff.config": "Request config changed",
			"inspector.diff.system": "System prompt changed",
			"inspector.diff.tools": "Tools +{added} −{removed} ~{modified}",
			"inspector.diff.tools.order": "Tool order changed",
			"inspector.diff.tools.orderHint": "Set and schemas unchanged, but declaration order changed — this can affect provider serialization and the prefix cache.",
			"inspector.diff.surface": "Est. surface +{delta} tokens",
			"inspector.diff.cache": "Cache reuse {before}% → {after}% ({delta} pts)",
			"inspector.likely.title": "Coincident changes",
			"inspector.likely.hint": "Correlation only — not causation.",
			"inspector.drop.banner": "Cache reuse dropped {delta} pts vs previous request",
			"cause.model-or-provider-changed": "Model or provider changed",
			"cause.system-changed": "System prompt changed",
			"cause.tools-changed": "Tool set changed",
			"cause.config-changed": "Request config changed",
			"cause.surface-grew": "Conversation surface grew",
			"cause.no-obvious-change": "No obvious request change",
			"empty.title": "No data yet",
			"empty.hint": "Context Lens observes LLM requests once they start flowing."
		};
		//#endregion
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
		//#endregion
		//#region \0dsh-css:/data/code/dsh-context-lens/src/client/context-lens.module.css.mjs
		const css = ".baafcW_root{box-sizing:border-box;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#1f2329);flex-direction:column;gap:12px;padding:12px;font-size:13px;display:flex;overflow:hidden}.baafcW_overview{flex-direction:column;flex:none;gap:8px;display:flex}.baafcW_chips{flex-wrap:wrap;gap:8px;display:flex}.baafcW_chip{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-radius:6px;align-items:baseline;gap:6px;padding:4px 10px;display:inline-flex}.baafcW_chipLabel{color:var(--dsw-alias-label-caption,#8a919f);font-size:12px}.baafcW_chipValue{font-variant-numeric:tabular-nums;font-weight:600}.baafcW_chipDanger{color:var(--dsw-static-red-600,#c62828)}.baafcW_banner{border:1px solid var(--dsw-static-red-300,#ef9a9a);background:var(--dsw-alias-interactive-bg-hover-danger,#ec13130d);color:var(--dsw-static-red-600,#c62828);border-radius:6px;padding:6px 10px;font-size:12px}.baafcW_layout{flex:1;gap:12px;min-height:0;display:flex}.baafcW_list{border-right:1px solid var(--dsw-alias-button-ghost-active-border,#80808033);width:300px;color:var(--dsw-alias-label-caption,#8a919f);flex-direction:column;flex:none;gap:4px;padding-right:8px;display:flex;overflow-y:auto}.baafcW_listItem{color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:1px solid #0000;border-radius:8px;flex-direction:column;gap:3px;padding:7px 10px;display:flex}.baafcW_listItem:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.baafcW_listItemSelected{background:var(--dsw-alias-interactive-bg-active,#2631481a);border-color:var(--dsw-alias-interactive-bg-active,#2631482e)}.baafcW_itemLine{align-items:center;gap:8px;min-width:0;display:flex}.baafcW_statusPill{border-radius:999px;flex:none;padding:3px 7px;font-size:11px;font-weight:600;line-height:1}.baafcW_statusPill_completed{color:var(--dsw-static-green-700,#1b5e20);background:var(--dsw-alias-interactive-bg-hover-success,#1b5e201a)}.baafcW_statusPill_failed{color:var(--dsw-static-red-600,#c62828);background:var(--dsw-alias-interactive-bg-hover-danger,#ec131314)}.baafcW_statusPill_aborted{color:var(--dsw-static-orange-700,#e65100);background:var(--dsw-alias-interactive-bg-hover-warning,#e651001a)}.baafcW_status{color:var(--dsw-alias-label-primary,#1f2329);font-size:12px;font-weight:600}.baafcW_seq{font-family:var(--ds-font-family-code,\"SF Mono\", Consolas, monospace);color:var(--dsw-alias-label-dimmed,#b6bcc7);min-width:0;font-size:11px}.baafcW_cacheCell{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#1f2329);flex:none;margin-left:auto;font-size:12px;font-weight:600}.baafcW_cacheCellDrop{color:var(--dsw-static-red-600,#c62828)}.baafcW_modelCell{color:var(--dsw-alias-label-dimmed,#b6bcc7);text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:11px;overflow:hidden}.baafcW_badges{flex:none;gap:4px;display:inline-flex}.baafcW_changedBadge{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-label-caption,#8a919f);border-radius:4px;padding:1px 6px;font-size:11px}.baafcW_dropBadge{background:var(--dsw-alias-interactive-bg-hover-danger,#ec13130d);color:var(--dsw-static-red-600,#c62828);border-radius:4px;padding:1px 6px;font-size:11px}.baafcW_inspector{min-width:0;color:var(--dsw-alias-label-caption,#8a919f);flex-direction:column;flex:1;gap:10px;display:flex;overflow-y:auto}.baafcW_panel{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-radius:6px;flex-direction:column;gap:6px;padding:8px 10px;display:flex}.baafcW_panelTitle{color:var(--dsw-alias-label-primary,#1f2329);align-items:center;gap:8px;font-size:12px;font-weight:600;display:flex}.baafcW_stats{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px 12px;display:grid}.baafcW_stat{flex-direction:column;gap:2px;display:flex}.baafcW_statLabel{color:var(--dsw-alias-label-caption,#8a919f);font-size:11px}.baafcW_statValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#1f2329);word-break:break-all}.baafcW_dim{color:var(--dsw-alias-label-dimmed,#b6bcc7);font-size:11px}.baafcW_mono{font-family:var(--ds-font-family-code,\"SF Mono\", Consolas, monospace);font-size:11px}.baafcW_toolsFold{flex-direction:column;gap:4px;margin-top:6px;display:flex}.baafcW_toolsToggle{color:var(--dsw-alias-label-caption,#8a919f);font:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;align-self:flex-start;align-items:center;gap:6px;padding:2px 6px;font-size:12px;display:inline-flex}.baafcW_toolsToggle:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-label-primary,#1f2329)}.baafcW_toolsToggleIcon{color:var(--dsw-alias-label-dimmed,#b6bcc7);font-size:10px}.baafcW_toolList{flex-direction:column;gap:2px;margin-top:2px;display:flex}.baafcW_toolRow{align-items:baseline;gap:8px;font-size:12px;display:flex}.baafcW_toolName{color:var(--dsw-alias-label-primary,#1f2329);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.baafcW_diffItem{color:var(--dsw-alias-label-primary,#1f2329);font-size:12px}.baafcW_causeList{border-top:1px dashed var(--dsw-alias-button-ghost-active-border,#80808033);flex-direction:column;gap:4px;margin-top:4px;padding-top:6px;display:flex}.baafcW_cause{color:var(--dsw-static-red-600,#c62828);font-size:12px}.baafcW_empty{color:var(--dsw-alias-label-dimmed,#b6bcc7);flex-direction:column;flex:1;justify-content:center;align-items:center;gap:6px;display:flex}.baafcW_emptyTitle{font-size:14px;font-weight:600}.baafcW_emptyHint{font-size:12px}";
		const tagId = "dsh-context-lens/context-lens.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-context-lens";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var context_lens_module_css_default = {
			"cause": "baafcW_cause",
			"seq": "baafcW_seq",
			"chip": "baafcW_chip",
			"chipLabel": "baafcW_chipLabel",
			"chipValue": "baafcW_chipValue",
			"panel": "baafcW_panel",
			"cacheCell": "baafcW_cacheCell",
			"statValue": "baafcW_statValue",
			"emptyTitle": "baafcW_emptyTitle",
			"emptyHint": "baafcW_emptyHint",
			"root": "baafcW_root",
			"itemLine": "baafcW_itemLine",
			"chips": "baafcW_chips",
			"toolList": "baafcW_toolList",
			"toolRow": "baafcW_toolRow",
			"causeList": "baafcW_causeList",
			"statusPill_completed": "baafcW_statusPill_completed",
			"status": "baafcW_status",
			"cacheCellDrop": "baafcW_cacheCellDrop",
			"stats": "baafcW_stats",
			"chipDanger": "baafcW_chipDanger",
			"statLabel": "baafcW_statLabel",
			"toolsToggle": "baafcW_toolsToggle",
			"layout": "baafcW_layout",
			"mono": "baafcW_mono",
			"empty": "baafcW_empty",
			"statusPill_failed": "baafcW_statusPill_failed",
			"changedBadge": "baafcW_changedBadge",
			"diffItem": "baafcW_diffItem",
			"statusPill_aborted": "baafcW_statusPill_aborted",
			"banner": "baafcW_banner",
			"listItem": "baafcW_listItem",
			"listItemSelected": "baafcW_listItemSelected",
			"badges": "baafcW_badges",
			"statusPill": "baafcW_statusPill",
			"inspector": "baafcW_inspector",
			"toolsToggleIcon": "baafcW_toolsToggleIcon",
			"toolName": "baafcW_toolName",
			"overview": "baafcW_overview",
			"list": "baafcW_list",
			"dropBadge": "baafcW_dropBadge",
			"modelCell": "baafcW_modelCell",
			"stat": "baafcW_stat",
			"dim": "baafcW_dim",
			"panelTitle": "baafcW_panelTitle",
			"toolsFold": "baafcW_toolsFold"
		};
		//#endregion
		//#region src/client/Overview.tsx
		function Overview(props) {
			const { summary, latest, t } = props;
			const drop = latest?.cache?.drop === true ? latest.cache : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.overview,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: context_lens_module_css_default.chips,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.chip,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.chipLabel,
								children: t("overview.requests")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.chipValue,
								children: summary.totalRequests
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.chip,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.chipLabel,
								children: t("overview.cacheDrops")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${context_lens_module_css_default.chipValue} ${summary.cacheDrops > 0 ? context_lens_module_css_default.chipDanger : ""}`,
								children: summary.cacheDrops
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.chip,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.chipLabel,
								children: t("overview.structuralChanges")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.chipValue,
								children: summary.structuralChanges
							})]
						})
					]
				}), drop !== void 0 && drop.deltaPoints !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: context_lens_module_css_default.banner,
					children: t("inspector.drop.banner", { delta: String(Math.round(Math.abs(drop.deltaPoints))) })
				})]
			});
		}
		//#endregion
		//#region src/client/RequestInspector.tsx
		/**
		* The request inspector: everything the projection knows about one request —
		* meta, provider usage, header fingerprints, the diff against its
		* predecessor, and (on a cache drop) the rule-ranked list of coincident
		* changes with the correlation disclaimer.
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
		function UsageRow(props) {
			const { label, value, t } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.stat,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: context_lens_module_css_default.statLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: context_lens_module_css_default.statValue,
					children: value === void 0 ? t("inspector.unavailable") : formatTokens(value)
				})]
			});
		}
		function HashRow(props) {
			const { label, hash, bytes, count, t } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.stat,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: context_lens_module_css_default.statLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: context_lens_module_css_default.statValue,
					children: [
						hash === void 0 ? t("inspector.unavailable") : shortHash(hash),
						bytes !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: context_lens_module_css_default.dim,
							children: [
								" · ",
								formatTokens(bytes),
								"B"
							]
						}),
						count !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: context_lens_module_css_default.dim,
							children: [" · ", count]
						})
					]
				})]
			});
		}
		function ToolsDiff(props) {
			const { added, removed, modified, t } = props;
			if (added.length === 0 && removed.length === 0 && modified.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.diffItem,
				children: t("inspector.diff.tools", {
					added: added.length === 0 ? "0" : cappedList(added, 4),
					removed: removed.length === 0 ? "0" : cappedList(removed, 4),
					modified: modified.length === 0 ? "0" : cappedList(modified, 4)
				})
			});
		}
		function ToolsOrderDiff(props) {
			const { orderChanged, t } = props;
			if (!orderChanged) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.diffItem,
				children: [t("inspector.diff.tools.order"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: context_lens_module_css_default.dim,
					children: [" — ", t("inspector.diff.tools.orderHint")]
				})]
			});
		}
		function RequestInspector(props) {
			const { request, t } = props;
			const [toolsOpen, setToolsOpen] = (0, react.useState)(false);
			if (request === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.inspector,
				children: t("list.empty")
			});
			const { usage, cache, header, diffFromPrevious } = request;
			const diff = diffFromPrevious;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_lens_module_css_default.inspector,
				children: [
					cache?.drop === true && cache.deltaPoints !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_lens_module_css_default.banner,
						children: t("inspector.drop.banner", { delta: String(Math.round(Math.abs(cache.deltaPoints))) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.panelTitle,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.seq,
								children: request.id
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.status,
								children: t(`list.status.${request.status}`)
							}),
							request.model !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.dim,
								children: request.model
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.panel,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: context_lens_module_css_default.panelTitle,
							children: t("inspector.usage")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.stats,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageRow, {
									label: t("inspector.input"),
									value: usage?.inputTokens,
									t
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageRow, {
									label: t("inspector.cacheRead"),
									value: usage?.cacheReadTokens,
									t
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageRow, {
									label: t("inspector.cacheWrite"),
									value: usage?.cacheWriteTokens,
									t
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageRow, {
									label: t("inspector.output"),
									value: usage?.outputTokens,
									t
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageRow, {
									label: t("inspector.reasoning"),
									value: usage?.reasoningTokens,
									t
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageRow, {
									label: t("inspector.cacheReuse"),
									value: cache?.reuse === void 0 ? void 0 : Math.round(cache.reuse * 1e3) / 10,
									t
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageRow, {
									label: t("inspector.surface"),
									value: request.estimatedSurfaceTokens,
									t
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.panel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.panelTitle,
								children: t("inspector.header")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: context_lens_module_css_default.stats,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HashRow, {
										label: t("inspector.configHash"),
										hash: header.configHash,
										t
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HashRow, {
										label: t("inspector.systemHash"),
										hash: header.systemHash,
										...header.systemBytes === void 0 ? {} : { bytes: header.systemBytes },
										t
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(HashRow, {
										label: t("inspector.tools", { count: String(header.toolCount ?? header.tools.length) }),
										hash: header.toolsHash,
										count: header.tools.length,
										t
									}),
									request.contextWindow !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageRow, {
										label: t("inspector.contextWindow"),
										value: request.contextWindow,
										t
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
					}),
					diff !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_lens_module_css_default.panel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.panelTitle,
								children: t("inspector.diff.title")
							}),
							diff.modelChanged && request.model !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.diffItem,
								children: t("inspector.diff.model", {
									before: "?",
									after: request.model
								})
							}),
							diff.providerChanged && request.provider !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.diffItem,
								children: t("inspector.diff.provider", {
									before: "?",
									after: request.provider
								})
							}),
							diff.configChanged && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.diffItem,
								children: t("inspector.diff.config")
							}),
							diff.system.changed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.diffItem,
								children: t("inspector.diff.system")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolsDiff, {
								added: diff.tools.added,
								removed: diff.tools.removed,
								modified: diff.tools.modified,
								t
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolsOrderDiff, {
								orderChanged: diff.tools.orderChanged,
								t
							}),
							diff.surface.estimatedDeltaTokens !== void 0 && diff.surface.estimatedDeltaTokens > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.diffItem,
								children: t("inspector.diff.surface", { delta: formatTokens(diff.surface.estimatedDeltaTokens) })
							}),
							diff.cache !== void 0 && diff.cache.previousHitRate !== void 0 && diff.cache.currentHitRate !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_lens_module_css_default.diffItem,
								children: t("inspector.diff.cache", {
									before: formatPercent(diff.cache.previousHitRate / 100),
									after: formatPercent(diff.cache.currentHitRate / 100),
									delta: String(Math.round(diff.cache.deltaPoints ?? 0))
								})
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
					})
				]
			});
		}
		//#endregion
		//#region src/client/RequestList.tsx
		/**
		* The recent-requests list: newest last, one card per request. The primary
		* line is the status (pill) with a dimmed turn:step tag; the secondary line
		* carries the model, the cache-reuse readout, and the structural-change /
		* cache-drop badges. The status carries the visual weight — the seq is
		* reference noise, not identity.
		*/
		function statusKey(status) {
			return `list.status.${status}`;
		}
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
			const { requests, selectedId, onSelect, t } = props;
			const selectedRef = (0, react.useRef)(null);
			const ordered = (0, react.useMemo)(() => [...requests].reverse(), [requests]);
			(0, react.useEffect)(() => {
				selectedRef.current?.scrollIntoView({ block: "nearest" });
			}, [selectedId]);
			if (requests.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.list,
				children: t("list.empty")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_lens_module_css_default.list,
				children: ordered.map((request) => {
					const changed = request.diffFromPrevious !== void 0 && (request.diffFromPrevious.tools.changed || request.diffFromPrevious.system.changed || request.diffFromPrevious.modelChanged || request.diffFromPrevious.providerChanged || request.diffFromPrevious.configChanged);
					const cache = cacheReadout(request, t);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						ref: request.id === selectedId ? selectedRef : void 0,
						className: `${context_lens_module_css_default.listItem} ${request.id === selectedId ? context_lens_module_css_default.listItemSelected : ""}`,
						onClick: () => onSelect(request.id),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.itemLine,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${context_lens_module_css_default.statusPill} ${context_lens_module_css_default[`statusPill_${request.status}`]}`,
									children: t(statusKey(request.status))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: context_lens_module_css_default.seq,
									children: request.id
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${context_lens_module_css_default.cacheCell} ${cache.drop ? context_lens_module_css_default.cacheCellDrop : ""}`,
									children: cache.text
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_lens_module_css_default.itemLine,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: context_lens_module_css_default.modelCell,
								children: request.model ?? ""
							}), (changed || cache.drop) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: context_lens_module_css_default.badges,
								children: [changed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: context_lens_module_css_default.changedBadge,
									children: t("list.changed")
								}), cache.drop && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: context_lens_module_css_default.dropBadge,
									children: t("list.cache.drop")
								})]
							})]
						})]
					}, request.id);
				})
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
			const latest = projection.latest ?? requests[requests.length - 1];
			const effectiveSelectedId = selected === void 0 ? latestRequestId(requests) : selectedId;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: context_lens_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Overview, {
					summary: projection.summary,
					latest,
					t
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: context_lens_module_css_default.layout,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RequestList, {
						requests,
						selectedId: effectiveSelectedId,
						onSelect: setSelectedId,
						t
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RequestInspector, {
						request: requests.find((request) => request.id === effectiveSelectedId) ?? null,
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