# 交接文档 — dsh-context-lens v0.1

> 适用场景：换一台电脑，`git clone` 后继续开发。本文件只讲"怎么把环境跑起来 + 当前卡在哪 + 下一步做什么"。
> 产品故事看 `README.md`（中英双语），工程细节看 `IMPLEMENTATION_NOTES.md`。

## 0. 三句话总结

- 这是一个 DeepSeek Harness 插件（服务端投影单元 + 客户端视图），回答"每次模型请求与上一次相比变了什么、缓存复用怎么随之变化"。
- 代码、测试、构建产物全部就绪：`pnpm install && pnpm typecheck && pnpm test && pnpm build` 全绿（53 个测试）。
- **唯一未完成的事**：在真实 harness 运行时里冒烟验证（见 §5）。npm 生态快照有坑，已被 `vendor-stubs/` 绕开（见 §3，**千万别删**）。

## 1. 拉取与运行

```sh
git clone https://github.com/gordonlu/dsh-context-lens.git
cd dsh-context-lens
pnpm install      # 必须成功，见 §3 的坑
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest，53 tests
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
- 服务端全链路：投影 fold、指纹、缓存数学、diff（含 `orderChanged`）、保留 100、累计计数。
- 客户端四组件 + 中英语言包 + CSS Modules；`useProjection('contextLens')` 席位读取。
- 构建：`lib/client.js` 是标准闭包工厂 ABI（`window.__ModuleLoader__.load({ id: "dsh-context-lens", factory: (require) => … })`，react/jsx-runtime 走 loader require，其余内联），已用 `node -e "import('./lib/index.js')"` 冒烟过 node 端。
- 53 测试全绿：指纹规范化、缓存数学、diff、生命周期/孤儿/重放一致性（live≡replay≡分块）、确定性。

**未完成 / 未验证（明天的主线）**
- ⛔ 真实 harness 运行时冒烟（§5）——所有 ABI 结论都来自解包 npm 包验证 + 代码审查，**没在真实环境跑过**。
- 客户端 bundle 在真实浏览器/loader 里的加载、插槽渲染、CSS 注入、中英切换。
- 投影注册进真实 SessionProvider 后 `request/header` 等事件的实际形状是否与 vendor 类型一致。

## 5. 下一步：真实环境冒烟（建议顺序）

1. 另开目录 `git clone https://github.com/deepseek-ai/deepseek-harness.git`（本机研究副本曾放在 `dsh-main/`，HEAD 47f9438，仅供查阅、已 gitignore）。
2. 按 harness README 装好运行时；确认它能加载外部插件目录（plugins/ 或 bundle patch 机制，见 `cordis.patch.yml` 和 harness 文档）。
3. 把本仓库 `lib/` 放入插件目录：服务端 load `lib/index.js`（+ `lib/invariant.js`），客户端应被 `/plugins/dsh-context-lens/client.js` 服务。
4. 开一个会话跑几轮对话（含一次系统提示/工具变化制造一次缓存回落），检查：
   - 投影输出：每步一条 record、header 指纹正确、usage 桶正确；
   - 视图：列表出现、选中后检查器渲染、回落横幅 + likelyCauses、工具顺序变化提示；
   - 中英语言包切换。
5. 任何事件形状/时序与 vendor 类型不符的地方，改 `src/`（vendor 类型不动，除非 deepseek-ai 发新版）。

## 6. 常用命令与检查

```sh
pnpm typecheck / pnpm test / pnpm build          # 三件套
node -e "import('./lib/index.js').then(m=>console.log(Object.keys(m)))"   # node 端冒烟
# 客户端 ABI 快速自检：lib/client.js 首行应是 __ModuleLoader__.load({...})
```

- 改了 `src/` 后务必 `pnpm build`；若 `lib/` 出现奇怪旧文件（如 `lib/types/src/`），先 `Remove-Item -Recurse -Force lib` 再 build。
- 改 `tsdown.config.ts` 时注意：`external`/`noExternal` 已被 tsdown 0.22 弃用，用 `deps.neverBundle` / `deps.alwaysBundle`。
- git 提交后要推，交付物以 git 为准。

## 7. 版本记录

- `598e692`（2026-08-14）：v0.1 全量交付（248 files）。
- 前置占位提交 `37fb987` 无实质内容。
