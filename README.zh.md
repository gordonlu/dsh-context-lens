<p align="center">
  <img src="assets/banner.png" alt="dsh-context-lens" width="100%" />
</p>

# dsh-context-lens

DeepSeek Harness 请求上下文分析器 — 看清每次模型请求之间发生了什么变化，以及缓存复用如何随之改变。

## 这是什么

`dsh-context-lens` 是 DeepSeek Harness 插件（服务端单元 + 客户端视图），持续回答一个问题：**"这次发给模型的内容是什么，与上一次请求相比变了什么？"** 它是纯粹的观察者——只读取会话日志，不写入任何事件，也不触碰任何模型调用。

<p align="center">
  <img src="assets/dsh-context-lens.png" alt="dsh-context-lens 仪表盘" width="100%" />
</p>

## 快速开始

```sh
dsh plugin --profile web add dsh-context-lens
```

打开任意会话，切到 **请求上下文** 标签页，每个模型请求都会以一行呈现：相对上次请求变了什么，缓存复用如何随之变化。

对每个真实 LLM 请求记录一张紧凑卡片：

- **请求身份** — turn:step、服务商、模型、上下文窗口、状态（完成 / 失败 / 中止）。
- **已提交的请求上下文** — 系统提示、工具集（每个工具的 schema 哈希 + 估算 token）、请求配置、工具声明顺序的规范化指纹。只比较真正提交给模型请求的状态；harness 的可变内存状态从不被观察。
- **缓存复用读数** — 严格由服务商互斥的用量桶计算（未缓存输入 + 缓存读取 + 缓存写入 = 计费输入）。缺失字段保持缺失（显示为 `-`），绝不为零。
- **与上次请求的差异** — 模型、服务商、配置、系统提示、工具集（+新增/−移除/~修改）、工具顺序、估算表面增量、缓存复用百分点边界。
- **回落警报** — 复用率跨过阈值回落时，按固定优先级列出同时发生的变化（仅相关，不构成因果），并附明确免责声明。

**视图是"变化优先"的**（`conversation.view` 插槽，中/英双语）。打开即可一眼回答"有没有异常、异常在哪"：

- **会话状态条** — ✓ 缓存稳定 / ✓ 结构稳定 / 已分析请求数；出现异常自动切换为 ⚠ 计数告警；
- **最近请求列表**，最新在上（最多保留 100 条），每条一行：会话全局序号、变化标签（稳定 / 缓存回落 / 工具变化 / 系统变化 / +X tok）、缓存读数，并默认开启"隐藏无变化请求"过滤；
- **检查器** — 缓存复用率（含与上次的涨跌）、新增未缓存输入、估算请求上下文，逐行对比上次请求（系统 / 工具 / 工具顺序 / 配置 / 模型 / 服务商），无缓存影响变化时给出绿色结论；
- 原始用量桶、请求头哈希、完整工具列表收进"查看技术细节"折叠。

## 准确度边界

左侧是真正可观测的；右侧从不声称。

| 可以确定 | 无法确定（也绝不声称） |
| --- | --- |
| 提交给请求的系统提示、工具集、工具 schema、声明顺序、请求配置 | 服务商内部缓存键的构造方式 |
| 每个请求的模型与服务商 | 前缀缓存断点的确切 token（KV 因果性） |
| 服务商上报的用量桶（未缓存输入 / 缓存读取 / 缓存写入 / 输出 / 推理） | 是哪一项变化导致回落——只有相关性 |
| 复用率及其相邻请求间的百分点差 | 离开 100 条窗口的会话/请求的缓存状态 |
| 启发式表面估算（字符/4 + 每块 + 每角色开销） | 有关 harness 内存状态的任何内容 |

## 架构

**服务端** — 一个纯的、可重放的投影单元（`contextLens`）折叠会话日志：`request/header` 事件（epoch 式记录，仅在变化时提交）定义每个 `step/start` 时刻生效的快照；步骤内到达的 header 事件替换它（那才是服务商实际看到的 header）。`step/end` 标记跨度收尾；最后一步在 `turn/end` 定稿、中间步在下一次 `step/start` 定稿，崩溃遗留的孤儿日志以 failed 关闭。重试不会产生新记录。无关事件原样返回同一状态引用——即注册表的零开销 `Object.is` 门。

**重放一致性是经过测试的不变量**：增量折叠（在线）与从 `init` 重放同一日志产生完全相同的状态与投影。

**客户端** — 在 `conversation.view` 插槽注册 `context-lens` 条目（order 30），通过框架的 `useProjection('contextLens')` 席位读取投影，并自带中英双语 locale 命名空间。选中状态为组件内状态。无重依赖 UI；CSS Modules 由 lightningcss 编译并以幂等的 `<style>` 标签注入。

**零开销** — 不产生新会话事件、不注入模型工具、不修改提示词、不模拟 KV 缓存。一个 no-op 伴生插件（`context-lens-invariant`）仅用于在 harness 的 invariants 服务下保留包名。

## 安装与构建

插件是 npm 包，运行时仅依赖 `zod`；所有 `@deepseek-ai/*` 引用都只是类型层面的。安装到 harness profile：

```sh
dsh plugin --profile web add dsh-context-lens
```

从源码开发：harness 各包的 npm 快照不完整（`@deepseek-ai/dsh-compact` 与 `@deepseek-ai/dsh-type-meta` 被引用但从未发布，而 pnpm ≥ 10/11 会自动安装 peer），因此本仓库在 `vendor-stubs/` 下以类型专用（type-only）快照的形式 vendor 了九个 `@deepseek-ai/dsh-*` 包（仅 `lib/types` + 净化后的 `package.json`；`dsh-llm` 附带 3 行品牌构造器运行时）。`@deepseek-ai/cordis` 走真实安装。详见 `IMPLEMENTATION_NOTES.md` → "npm snapshot gaps"。

```sh
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest — 63 个测试：指纹、缓存数学、差异、投影生命周期、step/end、重放一致性、格式化、确定性
pnpm build       # tsc 声明 → lib/types，tsdown → lib/index.js + lib/invariant.js + lib/client.js（浏览器，闭包工厂 ABI）
```

浏览器产物复刻 harness 客户端 ABI：`window.__ModuleLoader__.load({ id: "dsh-context-lens", factory: (require) => … })`，`react` / `react-dom` / 平台模块表条目通过 loader 注入的 require 解析，其余全部内联。

真实运行时冒烟脚本在 `smoke/`（见 `smoke/README.md`）：真实 harness 包的服务端冒烟、客户端 loader ABI 冒烟、以及基于第二个 web 实例 + mock LLM 的完整 GUI E2E。

## 目录

```
src/                服务端：types、fingerprint、cache、diff、projection、index；伴生 invariant
src/client/         会话视图 + 语言包 + CSS Modules
tests/              vitest 用例（含重放一致性套件）
smoke/              真实运行时冒烟：服务端、客户端 ABI、GUI E2E
vendor-stubs/       @deepseek-ai/dsh-* 包的类型专用 vendor 快照
cordis.patch.yml    dsh bundle patch 元数据
```

## 路线图

- 保留窗口游标，可查看 100 条之外的旧请求。
- 相关性下钻：按（模型、服务商、工具集哈希）在窗口内分组统计回落。
- 状态条区分"会话级计数"与"保留窗口"（#127 的回落不应显示为"最近 100 条干净"）。

## 许可

MIT
