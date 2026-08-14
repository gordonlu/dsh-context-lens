# 交接文档 — dsh-context-lens v0.1

> 适用场景：换一台电脑，`git clone` 后继续开发。本文件只讲"怎么把环境跑起来 + 当前卡在哪 + 下一步做什么"。
> 产品故事看 `README.md`（中英双语），工程细节看 `IMPLEMENTATION_NOTES.md`。

## 0. 三句话总结

- 这是一个 DeepSeek Harness 插件（服务端投影单元 + 客户端视图），回答"每次模型请求与上一次相比变了什么、缓存复用怎么随之变化"。
- 代码、测试、构建产物全部就绪：`pnpm install && pnpm typecheck && pnpm test && pnpm build` 全绿（**60** 个测试）。
- **§5 的真实运行时冒烟已在本机 harness checkout 上完成**（`smoke/`，见 §5）：服务端真实包全链路 + 客户端真实 loader ABI 都过了，过程中抓到并修复了 3 个"单测看不见"的 bug。剩余唯一未做的是完整 GUI 会话 E2E（渲染、中英切换、`/plugins` 服务路径）。npm 生态快照的坑照旧被 `vendor-stubs/` 绕开（见 §3，**千万别删**）。

## 1. 拉取与运行

```sh
git clone https://github.com/gordonlu/dsh-context-lens.git
cd dsh-context-lens
pnpm install      # 必须成功，见 §3 的坑
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest，60 tests
pnpm build        # tsc 声明 -> lib/types；tsdown -> lib/index.js + lib/invariant.js + lib/client.js
```

- 本机验证版本：node **v24.15.0**、pnpm **11.9.0**。要求 node ≥ 20.19 / 22.12（vite 8 的门槛）、pnpm ≥ 10（11 也行，见 §3）。
- `lib/`（构建产物）**已提交进 git**，clone 下来不 build 也能直接用；`node_modules/`、`dsh-main/` 被 gitignore。
- `.npmrc`（已提交）：`registry=https://registry.npmjs.org` + `auto-install-peers=false`。**保持 npmjs registry**——npmmirror 上 `@deepseek-ai/*` 会 404 且经常超时。
- Windows 注意：PowerShell 5.1 不支持 `&&`，但 npm scripts 内部走 cmd，脚本里的 `&&` 没问题；直接在 PS 里手动敲命令时用分号。

## 2. 目录地图

```
src/index.ts          服务端插件入口（definePlugin，inject 无依赖，注册投影）
src/projection.ts     核心：contextLens 纯投影 fold（请求生命周期、状态矩阵、定稿）
src/fingerprint.ts    规范化指纹（排序键、保留数组序）+ token 估算
src/cache.ts          复用率/回落检测/表面警报（阈值常量全导出）
src/diff.ts           请求间 diff + likelyCauses 规则排序（仅回落时填充）
src/types.ts          全部公开类型 + zod schema（输出会过 schema 校验）
src/invariant.ts      伴生 no-op 插件（占位包名，inject=['invariants']）
src/client/           index.ts（插槽注册 order 30）+ ContextView/Overview/RequestList/
                      RequestInspector + locales.ts（中英）+ context-lens.module.css
tests/                fingerprint/cache/diff/projection 四个 spec + helpers.ts
smoke/                真实运行时冒烟（§5）：server-smoke.mts（真实 harness 包 +
                      AgentLoop 驱动）+ client-smoke.mts（真实 loader ABI）+ css-hook.mjs
vendor-stubs/         九个 @deepseek-ai/dsh-* 的类型专用 vendor（见 §3）
tsdown.config.ts      双端构建：node ESM + 浏览器闭包工厂包；CSS Modules 虚拟插件
cordis.patch.yml      dsh bundle patch 元数据（dsh.client.inject 声明）
```

## 3. 最大的坑：npm 快照不完整（已解决，但要知道）

- `@deepseek-ai/dsh-compact`（dsh-client-runtime 的 dep、ui-conversation 的 peer）和 `@deepseek-ai/dsh-type-meta`（runtime/session 的 peer）**在所有 registry 上都不存在**。
- pnpm ≥ 10 会无视 `auto-install-peers=false` 强制装 peer；`pnpm.overrides` 对 registry 里不存在的包也无效（两个都做过 scratch 实验验证）。
- **解法**：`vendor-stubs/<pkg>/` 存的是 npm 包 `lib/types` 的逐字快照 + 净化 package.json（**没有任何 dependencies/peerDependencies**，exports 只留 `types` 条件）。devDependencies 里以 `file:./vendor-stubs/<pkg>` 引用。`@deepseek-ai/cordis@4.0.1` 走真实安装。
- `skipLibCheck` 会吞掉 vendor d.ts 里对缺失包的 import（已用 TS 6.0.3 验证）。
- `vendor-stubs/dsh-llm/runtime.js`：3 行品牌构造器（`MessageId`/`CallId`/`ProviderRequestId`），因为测试把品牌函数当值 import。
- **规则**：不要"修复"依赖——除非 deepseek-ai 把缺失包发上 npm，否则 vendor-stubs 必须原样保留。若将来补齐，把 `file:` devDep 换回 registry 范围并删掉 `vendor-stubs/` 即可（IMPLEMENTATION_NOTES.md 有步骤）。
- 已知残余：registry 版 `dsh-session-projection` 声明 `zod@^4.4.3`，本项目钉在 `^3.23.8`——skipLibCheck 下共存通过，别去升级 zod。

## 4. 当前状态

**已完成并验证**
- 服务端全链路：投影 fold、指纹、缓存数学、diff（含 `orderChanged`）、保留 100、累计计数；**`step/end` 折叠**（多步回合中间步正确标 completed）。
- 客户端四组件 + 中英语言包 + CSS Modules；`useProjection('contextLens')` 席位读取。
- 构建：`lib/client.js` 是标准闭包工厂 ABI（`window.__ModuleLoader__.load({ id: "dsh-context-lens", factory: (require) => … })`，react/jsx-runtime 走 loader require，其余内联），已用 `node -e "import('./lib/index.js')"` 冒烟过 node 端。
- **真实运行时冒烟（§5）三层全过**：服务端（真实包 + AgentLoop，55 断言）、客户端 ABI（真实 loader + SlotRegistry + locale，12 断言）、完整 GUI E2E（第二个 web 实例 + mock LLM + 真实浏览器，17 断言）。60 测试全绿。
- 冒烟抓到并修复 4 个"单测看不见"的 bug（详见 §5.1）：schema 缺 `orderChanged`、`step/end` 未折叠、客户端 external 无 scope key、无 config row 挂载失败。

**未完成 / 未验证（低优先级）**
- 带真实缓存波动的会话里看回落横幅 + likelyCauses 的渲染路径（mock usage 固定，触发不了；服务端逻辑已覆盖）。
- `dsh plugin add` 正式安装路径（symlink + patch 挂载已验证）。

## 5. 真实环境冒烟：已完成（服务端 + 客户端 ABI + 完整 GUI E2E）

### 5.1 已完成的冒烟（本机 harness checkout 上跑通）

`smoke/` 三个脚本，直接复用本机 `/data/code/deepseek-harness` checkout 的**真实包**（tsconfig paths 解析，非 vendor-stubs）：

```sh
HARNESS=/data/code/deepseek-harness
TSX="$HARNESS/node_modules/.bin/tsx"
# 服务端：真实 Cordis + session/llm/tools/agent-loop/session-projection 包，
# 挂载 lib/index.js，用脚本化 adapter 驱动真实 AgentLoop 六轮（多步回合、
# 工具调用、系统/工具变更、中止），54 项断言；JSON dump 到 smoke/out/
"$TSX" --tsconfig "$HARNESS/tsconfig.json" smoke/server-smoke.mts
# 客户端：lib/client.js 按真实 loader 方式加载，external 对照 shell 真实
# PLATFORM_MODULES 校验，挂进真实 SlotRegistry + 真实 locale 插件，12 项断言
DSH_SMOKE_HARNESS="$HARNESS" "$TSX" --tsconfig "$HARNESS/tsconfig.json" smoke/client-smoke.mts
# 完整 GUI E2E（见 smoke/README.md 的启动步骤）：mock LLM + 独立 DSH_HOME 的
# 第二个 web 实例 + 真实浏览器，17 项断言
"$TSX" smoke/e2e.mts
```

验证结论：
- 投影在真实 SessionProvider/registry 里注册、驱动、读取全通；`request/header`/`request/context`/`step/end` 等事件形状与 vendor 类型一致；读路径 schema 校验通过。
- 客户端 bundle 通过真实 loader ABI 加载，CSS 注入、插槽注册（id/order/locale）、真实 locale 翻译、dispose 清理全部正常。
- **GUI E2E**：第二个 web 实例（`--profile web --port 3081` + 独立 DSH_HOME + DEEPSEEK_* 指向 mock LLM）真实浏览器里：`/plugins/dsh-context-lens/client.js` 200、boot manifest 含 entry、CSS 注入、`请求上下文`/`Request Context` tab 渲染、Overview（请求/回落/结构变化）、记录列表 + 检查器（usage 桶、unavailable 语义）、两轮真实会话两条记录、zh↔en 切换闭环、无页面错误。

**冒烟抓到并修复的 4 个 bug（单测看不见，回归测试已补）**：
1. `toolsDiffSchema`（strict）漏了 `orderChanged` 字段 → 真实 registry `snapshot()` 读路径抛 `unrecognized_keys`，投影在真实运行时读不出来。修 schema + 加"view 输出过 schema.parse"回归测试。
2. 投影不折叠 `step/end` → 真实 loop 的多步回合中间步被孤儿路径误标 `failed`（单测的合成 log 每步都发 turn/end，没暴露）。修 fold（`stepEnded` 标记）+ 6 个 step/end 生命周期测试。
3. `CLIENT_EXTERNALS` 五个 dsh-* 用的是无 scope 的 key（`dsh-client-ui-slots` 等），真实模块表是 `@deepseek-ai/` scope 的 → 真实浏览器会 miss table 加载失败。已改 scope 对齐，冒烟脚本会把该列表与 shell 的 `PLATFORM_MODULES` 源码逐项比对。
4. 无 `config` 的 profile row 挂载失败：`Config = z.object({})` 对 `undefined` 报 Required → 整个插件树 boot 失败（E2E 起第二个实例时当场抓到）。已改 `z.object({}).default({})`，server-smoke 加断言。

### 5.2 剩余（低优先级）

- 带真实缓存波动（cacheRead 变化）的会话里看回落横幅 + likelyCauses 的渲染路径（mock LLM 的 usage 固定为 3 tok，无法触发；服务端逻辑已由 server-smoke 覆盖）。
- `dsh plugin --profile <name> add <path>` 正式安装路径尚未验证（E2E 用 symlink + profile patch 挂载）；理论上 `dsh.bundle` 声明齐全，但 pnpm peer 坑（§3）可能让它装不上 —— 需要时用 symlink 法。

### 5.3 事件形状核对记录

- 真实 `EpochHeader.config`（`LlmCallConfig`）含 `provider`/`model` ✓；`ToolSchema` 有 `name` ✓；`StreamChunk['usage']`、`TokenUsage` 字段与插件读取一致 ✓；`turn/end.reason.kind` 含 aborted/error/completed/blocked/max-tokens/interrupted（插件只关心 aborted/error，其余归 other）✓。

## 6. 常用命令与检查

```sh
pnpm typecheck / pnpm test / pnpm build          # 三件套
node -e "import('./lib/index.js').then(m=>console.log(Object.keys(m)))"   # node 端冒烟
# 真实运行时冒烟（需要本机 harness checkout，见 §5.1）
HARNESS=/data/code/deepseek-harness
"$HARNESS/node_modules/.bin/tsx" --tsconfig "$HARNESS/tsconfig.json" smoke/server-smoke.mts
DSH_SMOKE_HARNESS="$HARNESS" "$HARNESS/node_modules/.bin/tsx" --tsconfig "$HARNESS/tsconfig.json" smoke/client-smoke.mts
# 客户端 ABI 快速自检：lib/client.js 首行应是 __ModuleLoader__.load({...})
```

- 改了 `src/` 后务必 `pnpm build`；若 `lib/` 出现奇怪旧文件（如 `lib/types/src/`），先 `Remove-Item -Recurse -Force lib` 再 build。
- 改 `tsdown.config.ts` 时注意：`external`/`noExternal` 已被 tsdown 0.22 弃用，用 `deps.neverBundle` / `deps.alwaysBundle`。
- git 提交后要推，交付物以 git 为准。

## 7. 版本记录

- `cb43346`（2026-08-14）：v0.1.1 真实运行时冒烟（`smoke/`）+ 修复冒烟抓到的 3 个 bug（schema `orderChanged`、`step/end` 折叠、客户端 external scope），60 测试。
- `598e692`（2026-08-14）：v0.1 全量交付（248 files）。
- 前置占位提交 `37fb987` 无实质内容。
